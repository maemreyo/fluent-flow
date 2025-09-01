// Groups service for client-side usage
// Uses HTTP API calls instead of direct Supabase client to maintain consistency
import { supabase } from '../supabase/client'

export interface Group {
  id: string
  name: string
  description: string | null
  is_private: boolean
  member_count: number
  role: string
  created_at: string
}

export interface GroupInvitation {
  id: string
  group_id: string
  email: string
  invite_token: string
  message: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  group: {
    name: string
    description: string | null
    is_private: boolean
    member_count: number
  }
  invited_by_user: {
    email: string
  }
}

export interface GroupSession {
  id: string
  title: string
  video_title: string | null
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  session_type: string
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  created_by: string
  share_token: string | null
  participant_count: number
  questions_count: number
  can_edit?: boolean
}

export class GroupsService {
  constructor(private baseUrl: string = '') {
    // Default to current domain if no baseUrl provided
    if (!this.baseUrl) {
      this.baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3838'
    }
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    // Try to get auth token from various sources
    if (typeof window !== 'undefined') {
      // For browser/extension context, try localStorage or other storage
      const token = localStorage.getItem('supabase_auth_token') || 
                   localStorage.getItem('access_token')
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  async getUserGroups(): Promise<{ groups: Group[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/api/user/groups`, {
      headers: await this.getAuthHeaders()
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `Failed to fetch groups (${response.status})`)
    }

    return await response.json()
  }

  async getInvitationByToken(token: string): Promise<GroupInvitation> {
    if (!supabase) {
      throw new Error('Supabase client not configured')
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
        invited_by,
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

    // Get inviter info
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }
    
    const { data: inviterData } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', data.invited_by)
      .single()

    // Get member count
    const { count } = await supabase
      .from('study_group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', data.group_id)

    return {
      ...data,
      group: {
        ...(data.group as any),
        member_count: count || 0
      },
      invited_by_user: {
        email: inviterData?.email || 'Unknown'
      }
    } as GroupInvitation
  }

  async acceptInvitation(invitationId: string, groupId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }
    
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', groupId)
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
      .eq('id', invitationId)

    if (inviteError) {
      throw new Error('Failed to accept invitation')
    }

    // Add user as group member
    const { error: memberError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: groupId,
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
        .eq('id', invitationId)

      throw new Error('Failed to join group')
    }
  }

  async declineInvitation(invitationId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }
    
    const { error } = await supabase
      .from('group_invitations')
      .update({
        status: 'declined'
      })
      .eq('id', invitationId)

    if (error) {
      throw new Error('Failed to decline invitation')
    }
  }

  async getGroupSessions(groupId: string, status?: string): Promise<{ sessions: GroupSession[]; total: number }> {
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }
    
    let query = supabase
      .from('group_quiz_sessions')
      .select(`
        id,
        quiz_title,
        video_title,
        scheduled_at,
        started_at,
        ended_at,
        status,
        created_by,
        session_type,
        share_token,
        created_at
      `)
      .eq('group_id', groupId)

    // Apply status filter if provided
    if (status && ['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: sessions, error: sessionsError } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`)
    }

    if (!sessions) {
      return { sessions: [], total: 0 }
    }

    // Get participant counts for each session
    const sessionIds = sessions.map((s: any) => s.id)
    const { data: participantCounts } = await supabase
      .from('group_session_participants')
      .select('session_id')
      .in('session_id', sessionIds)

    const participantCountMap = participantCounts?.reduce((acc: Record<string, number>, p: any) => {
      acc[p.session_id] = (acc[p.session_id] || 0) + 1
      return acc
    }, {}) || {}

    // Format sessions with participant counts
    const formattedSessions: GroupSession[] = sessions.map((session: any) => ({
      id: session.id,
      title: session.quiz_title,
      video_title: session.video_title,
      status: session.status,
      session_type: session.session_type,
      scheduled_at: session.scheduled_at,
      started_at: session.started_at,
      ended_at: session.ended_at,
      created_by: session.created_by,
      share_token: session.share_token,
      participant_count: participantCountMap[session.id] || 0,
      questions_count: 0 // Can be populated from questions_data if needed
    }))

    return { sessions: formattedSessions, total: formattedSessions.length }
  }

  async updateSession(groupId: string, sessionId: string, updates: Partial<GroupSession>): Promise<GroupSession> {
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }
    
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Verify user can edit (this should be checked on the API side too)
    const { data: membership } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      throw new Error('Access denied')
    }

    // Build update object
    const updateData: any = {}
    if (updates.title !== undefined) updateData.quiz_title = updates.title
    if (updates.scheduled_at !== undefined) updateData.scheduled_at = updates.scheduled_at
    if (updates.session_type !== undefined) updateData.session_type = updates.session_type
    if (updates.status !== undefined) updateData.status = updates.status

    const { data: updatedSession, error } = await supabase
      .from('group_quiz_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`)
    }

    return {
      id: updatedSession.id,
      title: updatedSession.quiz_title,
      video_title: updatedSession.video_title,
      status: updatedSession.status,
      session_type: updatedSession.session_type,
      scheduled_at: updatedSession.scheduled_at,
      started_at: updatedSession.started_at,
      ended_at: updatedSession.ended_at,
      created_by: updatedSession.created_by,
      share_token: updatedSession.share_token,
      participant_count: 0,
      questions_count: 0
    }
  }
}