import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../contexts/AuthContext'

interface InvitationInfo {
  id: string
  group_id: string
  email: string
  invite_token: string
  message: string
  status: string
  expires_at: string
  group: {
    name: string
    description: string
    member_count: number
    is_private: boolean
  }
  invited_by_user: {
    email: string
  }
}

export function useJoinGroupByInvitation(token: string | null) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch invitation details
  const {
    data: invitation,
    isLoading,
    error: fetchError
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async (): Promise<InvitationInfo> => {
      if (!token || !supabase) {
        throw new Error('Invalid token or database not configured')
      }

      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          id,
          group_id,
          email,
          invite_token,
          message,
          status,
          expires_at,
          group:study_groups (
            name,
            description,
            is_private
          )
        `)
        .eq('invite_token', token)
        .single()

      if (error || !data) {
        throw new Error('Invalid or expired invitation link')
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('This invitation has expired')
      }

      // Check if invitation is not pending
      if (data.status !== 'pending') {
        if (data.status === 'accepted') {
          throw new Error('This invitation has already been accepted')
        } else if (data.status === 'declined') {
          throw new Error('This invitation has been declined')
        } else {
          throw new Error('This invitation is no longer valid')
        }
      }

      // Get invited_by user info separately
      const { data: inviterData } = await supabase
        .from('group_invitations')
        .select(`
          invited_by:auth.users (
            email
          )
        `)
        .eq('invite_token', token)
        .single()

      if (inviterData) {
        (data as any).invited_by_user = (inviterData as any).invited_by
      }

      // Get member count
      const { count } = await supabase
        .from('study_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', data.group_id)

      return {
        ...data,
        group: {
          ...(data as any).group,
          member_count: count || 0
        }
      } as InvitationInfo
    },
    enabled: !!token && !!supabase,
    retry: false
  })

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!invitation || !user || !supabase) {
        throw new Error('Missing required data')
      }

      // Check if user email matches invitation email
      if (user.email !== invitation.email) {
        throw new Error(`This invitation is for ${invitation.email}. Please sign in with the correct email address.`)
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('study_group_members')
        .select('id')
        .eq('group_id', invitation.group_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingMember) {
        throw new Error('You are already a member of this group')
      }

      // Start transaction: Accept invitation and add as member
      const { error: inviteError } = await supabase
        .from('group_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (inviteError) {
        throw new Error('Failed to accept invitation')
      }

      // Add user as group member
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: invitation.group_id,
          user_id: user.id,
          user_email: user.email,
          role: 'member',
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        // Rollback invitation status
        await supabase
          .from('group_invitations')
          .update({
            status: 'pending',
            accepted_at: null
          })
          .eq('id', invitation.id)

        throw new Error('Failed to join group')
      }

      return {
        groupId: invitation.group_id,
        groupName: invitation.group.name
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
    }
  })

  // Decline invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!invitation || !supabase) {
        throw new Error('Missing required data')
      }

      const { error } = await supabase
        .from('group_invitations')
        .update({
          status: 'declined'
        })
        .eq('id', invitation.id)

      if (error) {
        throw new Error('Failed to decline invitation')
      }
    }
  })

  return {
    invitation,
    isLoading,
    error: fetchError?.message,
    acceptInvitation: acceptInvitationMutation.mutate,
    isAccepting: acceptInvitationMutation.isPending,
    acceptError: acceptInvitationMutation.error?.message,
    acceptSuccess: acceptInvitationMutation.isSuccess,
    acceptData: acceptInvitationMutation.data,
    declineInvitation: declineInvitationMutation.mutate,
    isDeclining: declineInvitationMutation.isPending,
    declineError: declineInvitationMutation.error?.message,
    canAccept: invitation && user && user.email === invitation.email
  }
}