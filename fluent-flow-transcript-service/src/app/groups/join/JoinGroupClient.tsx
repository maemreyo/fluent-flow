'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Users, Mail, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { AuthPrompt } from '../../../components/auth/AuthPrompt'
import { useJoinGroupByInvitation } from '../../../hooks/useJoinGroupByInvitation'
import { useJoinGroupByCode } from '../../../hooks/useJoinGroupByCode'

export default function JoinGroupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const token = searchParams.get('token')
  const code = searchParams.get('code')

  // Use invitation hook if token exists
  const {
    invitation,
    isLoading: invitationLoading,
    error: invitationError,
    acceptInvitation,
    isAccepting,
    acceptError,
    acceptSuccess,
    acceptData,
    declineInvitation,
    isDeclining,
    canAccept
  } = useJoinGroupByInvitation(token)

  // Use code join hook if code exists
  const {
    joinGroup,
    isJoining,
    error: joinError,
    isSuccess: joinSuccess,
    data: joinData
  } = useJoinGroupByCode()

  // Handle direct join by code on mount
  useEffect(() => {
    if (authLoading) return
    
    if (!token && !code) {
      return
    }

    if (code && user) {
      joinGroup(code)
    }
  }, [code, user, authLoading, joinGroup, token])

  // Handle redirects
  useEffect(() => {
    if (acceptSuccess && acceptData) {
      setTimeout(() => {
        router.push(`/groups/${acceptData.groupId}`)
      }, 2000)
    }
  }, [acceptSuccess, acceptData, router])

  useEffect(() => {
    if (joinSuccess && joinData) {
      setTimeout(() => {
        router.push(`/groups/${joinData.group.id}`)
      }, 2000)
    }
  }, [joinSuccess, joinData, router])

  // Add decline redirect handler
  const handleDeclineSuccess = () => {
    router.push('/')
  }

  const isLoading = authLoading || invitationLoading || isJoining
  const error = invitationError || acceptError || joinError
  const success = acceptSuccess || joinSuccess
  const groupName = acceptData?.groupName || joinData?.group.name

  // Handle no token/code error
  if (!token && !code) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                No invitation token or group code provided
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

  if (isLoading) {
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
              Successfully joined {groupName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                You&apos;ve successfully joined the study group. Redirecting to group dashboard...
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
            You&apos;ve been invited to join a study group
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
          {!canAccept && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation is for <strong>{invitation.email}</strong>. 
                You&apos;re currently signed in as <strong>{user?.email}</strong>. 
                You&apos;ll need to sign in with the correct email to accept this invitation.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => acceptInvitation()}
              disabled={isAccepting || !canAccept}
              className="flex-1"
            >
              {isAccepting ? 'Joining...' : 'Accept Invitation'}
            </Button>
            <Button
              onClick={() => {
                declineInvitation()
                handleDeclineSuccess()
              }}
              disabled={isDeclining}
              variant="outline"
              className="flex-1"
            >
              {isDeclining ? 'Declining...' : 'Decline'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
