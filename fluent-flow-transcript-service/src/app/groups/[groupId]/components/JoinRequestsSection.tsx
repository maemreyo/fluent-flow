'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface JoinRequest {
  id: string
  user_email: string
  username: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  processed_at?: string
  processed_by?: string
  rejection_reason?: string
}

interface JoinRequestsSectionProps {
  groupId: string
  canManageMembers: boolean
  onMemberAdded?: () => void
}

export function JoinRequestsSection({ groupId, canManageMembers, onMemberAdded }: JoinRequestsSectionProps) {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchJoinRequests = async () => {
    if (!canManageMembers) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/join-requests`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch join requests')
      }

      const data = await response.json()
      setJoinRequests(data.joinRequests || [])
    } catch (err) {
      console.error('Error fetching join requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch join requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJoinRequests()
  }, [groupId, canManageMembers])

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' })
      })

      if (!response.ok) {
        throw new Error('Failed to approve join request')
      }

      // Refresh the requests list
      await fetchJoinRequests()
      onMemberAdded?.()
    } catch (err) {
      console.error('Error approving join request:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve join request')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!selectedRequestId) return

    setProcessing(selectedRequestId)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/join-requests/${selectedRequestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'reject',
          rejectionReason: rejectionReason.trim() || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reject join request')
      }

      // Refresh the requests list
      await fetchJoinRequests()
      setShowRejectModal(false)
      setSelectedRequestId(null)
      setRejectionReason('')
    } catch (err) {
      console.error('Error rejecting join request:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject join request')
    } finally {
      setProcessing(null)
    }
  }

  const openRejectModal = (requestId: string) => {
    setSelectedRequestId(requestId)
    setShowRejectModal(true)
  }

  if (!canManageMembers) {
    return null
  }

  const pendingRequests = joinRequests.filter(req => req.status === 'pending')

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Join Requests</h3>
        <div className="text-center py-4 text-gray-500">Loading join requests...</div>
      </div>
    )
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Join Requests</h3>
        <div className="text-center py-4 text-gray-500">No pending join requests</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        Join Requests ({pendingRequests.length})
      </h3>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{request.username}</p>
                <p className="text-sm text-gray-600">{request.user_email}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requested {new Date(request.requested_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove(request.id)}
                disabled={processing === request.id}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {processing === request.id ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openRejectModal(request.id)}
                disabled={processing === request.id}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this join request? You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Optional: Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false)
                setSelectedRequestId(null)
                setRejectionReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing !== null}
            >
              {processing ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}