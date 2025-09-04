'use client'

import { useState } from 'react'
import { 
  Calendar, 
  Clock, 
  Users, 
  Play, 
  CheckCircle, 
  XCircle,
  Edit,
  ExternalLink,
  BarChart3
} from 'lucide-react'
import { FullscreenModal } from '../ui/dialog'
import { Button } from '../ui/button'

interface SessionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
  groupId: string
  canManage: boolean
  onEdit: (session: any) => void
  onJoin: (session: any) => void
  onViewResults: (session: any) => void
}

export function SessionDetailsModal({
  isOpen,
  onClose,
  session,
  groupId,
  canManage,
  onEdit,
  onJoin,
  onViewResults
}: SessionDetailsModalProps) {
  if (!session) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-5 w-5 text-green-600" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-gray-600" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'scheduled':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const shouldShowViewResults = () => {
    return session.status === 'completed' || 
           (session.status === 'active' && session.result_count > 0)
  }

  const shouldShowJoin = () => {
    return session.status === 'active' || session.status === 'scheduled'
  }

  return (
    <FullscreenModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl w-[90vw] bg-white border border-gray-200 shadow-xl"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {getStatusIcon(session.status)}
              <h2 className="text-2xl font-bold text-gray-900">
                {session.title || session.video_title || 'Quiz Session'}
              </h2>
              <span className={`rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(session.status)}`}>
                {session.status}
              </span>
            </div>
            
            {session.video_title && session.title !== session.video_title && (
              <p className="text-gray-600 mb-2">📺 {session.video_title}</p>
            )}
          </div>
          
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(session)}
              className="ml-4"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {/* Session Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Session Type</h3>
              <p className="text-gray-900 capitalize">{session.session_type || 'Standard'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
              <p className="text-gray-900">{formatDate(session.created_at)}</p>
            </div>
            
            {session.scheduled_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Scheduled For</h3>
                <p className="text-gray-900">{formatDate(session.scheduled_at)}</p>
              </div>
            )}
            
            {session.started_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Started</h3>
                <p className="text-gray-900">{formatDate(session.started_at)}</p>
              </div>
            )}
          </div>
          
          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Participants</h3>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <p className="text-gray-900">{session.result_count || 0} participants</p>
              </div>
            </div>
            
            {session.questions_count > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Questions</h3>
                <p className="text-gray-900">{session.questions_count} questions</p>
              </div>
            )}
            
            {session.ended_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Ended</h3>
                <p className="text-gray-900">{formatDate(session.ended_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-6 border-t">
          {shouldShowJoin() && (
            <Button
              onClick={() => onJoin(session)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              {session.status === 'active' ? 'Join Session' : 'Enter Room'}
            </Button>
          )}
          
          {shouldShowViewResults() && (
            <Button
              variant="outline"
              onClick={() => onViewResults(session)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Results
            </Button>
          )}
          
          {session.share_token && (
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/questions/${session.share_token}`
                window.open(url, '_blank')
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Quiz
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={onClose}
            className="ml-auto"
          >
            Close
          </Button>
        </div>
      </div>
    </FullscreenModal>
  )
}