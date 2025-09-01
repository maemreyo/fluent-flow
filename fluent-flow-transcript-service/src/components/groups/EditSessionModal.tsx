'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Users, Save } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'

interface GroupSession {
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
}

interface EditSessionModalProps {
  session: GroupSession
  groupId: string
  onClose: () => void
  onSave: (updatedSession: Partial<GroupSession>) => Promise<void>
  canEdit: boolean
}

export default function EditSessionModal({
  session,
  groupId,
  onClose,
  onSave,
  canEdit
}: EditSessionModalProps) {
  const [formData, setFormData] = useState({
    title: session.title || '',
    description: '',
    scheduledAt: session.scheduled_at ? new Date(session.scheduled_at).toISOString().slice(0, 16) : '',
    sessionType: session.session_type || 'scheduled',
    status: session.status,
    notifyMembers: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canEdit) {
      setError('You do not have permission to edit this session')
      return
    }

    if (!formData.title.trim()) {
      setError('Session title is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const updatedSession: Partial<GroupSession> = {
        title: formData.title.trim(),
        session_type: formData.sessionType,
        status: formData.status,
        scheduled_at: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null
      }

      await onSave(updatedSession)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return 'Not set'
    return new Date(dateTime).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100'
      case 'active': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-gray-600 bg-gray-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {canEdit ? 'Edit Session' : 'Session Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Info Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(session.status)}`}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2 font-medium">{session.session_type}</span>
            </div>
            <div>
              <span className="text-gray-600">Participants:</span>
              <span className="ml-2 font-medium">{session.participant_count}</span>
            </div>
            <div>
              <span className="text-gray-600">Questions:</span>
              <span className="ml-2 font-medium">{session.questions_count}</span>
            </div>
            {session.video_title && (
              <div className="col-span-2">
                <span className="text-gray-600">Video:</span>
                <span className="ml-2 font-medium">{session.video_title}</span>
              </div>
            )}
            {session.started_at && (
              <div>
                <span className="text-gray-600">Started:</span>
                <span className="ml-2 font-medium">{formatDateTime(session.started_at)}</span>
              </div>
            )}
            {session.ended_at && (
              <div>
                <span className="text-gray-600">Ended:</span>
                <span className="ml-2 font-medium">{formatDateTime(session.ended_at)}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
              Session Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              disabled={!canEdit}
              className="mt-1"
              placeholder="Enter session title"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!canEdit}
              className="mt-1"
              placeholder="Optional description for this session"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Scheduled Date/Time */}
          <div>
            <Label htmlFor="scheduledAt" className="text-sm font-semibold text-gray-700">
              Scheduled Date & Time
            </Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              disabled={!canEdit}
              className="mt-1"
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for immediate sessions
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Session Type */}
            <div>
              <Label htmlFor="sessionType" className="text-sm font-semibold text-gray-700">
                Session Type
              </Label>
              <Select
                value={formData.sessionType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sessionType: value }))}
                disabled={!canEdit}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-sm font-semibold text-gray-700">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                disabled={!canEdit}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notify Members Toggle */}
          {canEdit && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifyMembers" className="text-sm font-semibold text-gray-700">
                  Notify Members
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Send notification about session changes to group members
                </p>
              </div>
              <Switch
                id="notifyMembers"
                checked={formData.notifyMembers}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyMembers: checked }))}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </form>

        {/* Share Link */}
        {session.share_token && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Label className="text-sm font-semibold text-gray-700">
              Session Link
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                value={`${window.location.origin}/questions/${session.share_token}?groupId=${groupId}&sessionId=${session.id}`}
                readOnly
                className="flex-1 bg-gray-50 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/questions/${session.share_token}?groupId=${groupId}&sessionId=${session.id}`)}
                className="px-3"
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}