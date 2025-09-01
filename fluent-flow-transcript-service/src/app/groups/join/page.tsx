'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase/client'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Users, Mail, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { AuthPrompt } from '../../../components/auth/AuthPrompt'

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

export default function JoinGroupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const token = searchParams.get('token')
  const code = searchParams.get('code') // Alternative: join by group code

  useEffect(() => {
    if (authLoading) return

    if (token) {
      fetchInvitationByToken()
    } else if (code) {
      // Handle joining by group code (direct join)
      handleDirectJoinByCode()
    } else {
      setError('No invitation token or group code provided')
      setLoading(false)
    }
  }, [token, code, authLoading])

  const fetchInvitationByToken = async () => {
    if (!token) return

    try {
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

      if (!error && data) {
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
          (data as any).invited_by_user = inviterData.invited_by
        }
      }

      if (error) {
        setError('Invalid or expired invitation link')
        return
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
        return
      }

      // Check if invitation is not pending
      if (data.status !== 'pending') {
        if (data.status === 'accepted') {
          setError('This invitation has already been accepted')
        } else if (data.status === 'declined') {
          setError('This invitation has been declined')
        } else {
          setError('This invitation is no longer valid')
        }
        return
      }

      // Get member count
      const { count } = await supabase
        .from('study_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', data.group_id)

      setInvitation({
        ...data,
        group: {
          ...data.group,
          member_count: count || 0
        }
      })
    } catch (error) {
      setError('Failed to load invitation details')
      console.error('Error fetching invitation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDirectJoinByCode = async () => {
    if (!code) return

    // TODO: Implement direct join by group code
    // This would be for public groups or groups that allow direct joining
    setError('Direct join by code not yet implemented')
    setLoading(false)
  }

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return

    setJoining(true)
    setError(null)

    try {
      // Check if user email matches invitation email
      if (user.email !== invitation.email) {
        setError(`This invitation is for ${invitation.email}. Please sign in with the correct email address.`)
        setJoining(false)
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('study_group_members')
        .select('id')
        .eq('group_id', invitation.group_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingMember) {
        setError('You are already a member of this group')
        setJoining(false)
        return
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
        setError('Failed to accept invitation')
        setJoining(false)
        return
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

        setError('Failed to join group')
        setJoining(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/groups/${invitation.group_id}`)
      }, 2000)

    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error accepting invitation:', error)
    } finally {
      setJoining(false)
    }
  }

  const handleDeclineInvitation = async () => {
    if (!invitation) return

    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({
          status: 'declined'
        })
        .eq('id', invitation.id)

      if (error) {
        setError('Failed to decline invitation')
        return
      }

      router.push('/')
    } catch (error) {
      setError('An unexpected error occurred')
      console.error('Error declining invitation:', error)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Join Study Group
            </CardTitle>
            <CardDescription>
              Sign in to accept your group invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthPrompt 
              onClose={() => router.push('/')} 
              onAuthSuccess={() => window.location.reload()} 
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Invitation Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full mt-4"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Welcome to the Group!
            </CardTitle>
            <CardDescription>
              Successfully joined {invitation?.group.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                You've successfully joined the study group. Redirecting to group dashboard...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invitation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                The invitation link appears to be invalid or expired.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full mt-4"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Users className="w-6 h-6" />
            Group Invitation
          </CardTitle>
          <CardDescription>
            You've been invited to join a study group
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Group Info */}
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-900 mb-2">{invitation.group.name}</h3>
            {invitation.group.description && (
              <p className="text-indigo-700 text-sm mb-2">{invitation.group.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-indigo-600">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {invitation.group.member_count} members
              </span>
              {invitation.group.is_private && (
                <span className="bg-indigo-200 px-2 py-1 rounded text-xs">Private</span>
              )}
            </div>
          </div>

          {/* Invitation Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              Invited by: {invitation.invited_by_user.email}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              Expires: {new Date(invitation.expires_at).toLocaleDateString()}
            </div>

            {invitation.message && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">{invitation.message}</p>
              </div>
            )}
          </div>

          {/* Email Verification Warning */}
          {user.email !== invitation.email && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation is for <strong>{invitation.email}</strong>. 
                You're currently signed in as <strong>{user.email}</strong>. 
                You'll need to sign in with the correct email to accept this invitation.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleAcceptInvitation}
              disabled={joining || user.email !== invitation.email}
              className="flex-1"
            >
              {joining ? 'Joining...' : 'Accept Invitation'}
            </Button>
            <Button
              onClick={handleDeclineInvitation}
              variant="outline"
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}