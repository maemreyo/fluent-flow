import { useEffect, useState } from 'react'
import { Calendar, Clock, Edit, Play, Plus, Trash2 } from 'lucide-react'
import { GroupQuizRoomModal } from '../../app/groups/[groupId]/components/sessions/GroupQuizRoomModal'
import { useGroupSessions } from '../../hooks/useGroupSessions'
import EditSessionModal from '../groups/EditSessionModal'
import { FullscreenModal } from '../ui/dialog'

interface SessionsTabProps {
  groupId: string
  canManage: boolean
  onCreateSession: () => void
  highlightSessionId?: string // New prop for highlighting specific session
}

interface SessionFilters {
  status: 'all' | 'scheduled' | 'active' | 'completed' | 'cancelled'
}

export default function SessionsTab({
  groupId,
  canManage,
  onCreateSession,
  highlightSessionId
}: SessionsTabProps) {
  const { sessions, loading, error, deleteSession, checkExpiredSessions } =
    useGroupSessions(groupId)
  const [filters, setFilters] = useState<SessionFilters>({ status: 'all' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<any | null>(null)
  const [quizRoomSession, setQuizRoomSession] = useState<any | null>(null)
  const [highlightPulse, setHighlightPulse] = useState<string | null>(highlightSessionId || null)
  const [joiningSession, setJoiningSession] = useState<string | null>(null) // Track which session is being validated

  // Remove highlight pulse after animation
  useEffect(() => {
    if (highlightSessionId) {
      const timer = setTimeout(() => {
        setHighlightPulse(null)
      }, 3000) // Remove highlight after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [highlightSessionId])

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

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'instant':
        return <Play className="h-4 w-4" />
      case 'scheduled':
        return <Calendar className="h-4 w-4" />
      case 'recurring':
        return <Clock className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredSessions = sessions.filter(
    (session: any) => filters.status === 'all' || session.status === filters.status
  )

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId)
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const handleJoinSession = async (session: any) => {
    setJoiningSession(session.id)

    try {
      // Check for expired sessions before joining
      await checkExpiredSessions()

      // Find the updated session status
      // Note: In a real implementation, you might want to refetch sessions
      // or check the specific session validity
      setQuizRoomSession(session)
    } catch (error) {
      console.error('Failed to validate session:', error)
    } finally {
      setJoiningSession(null)
    }
  }

  const isHighlighted = (sessionId: string) => {
    return highlightSessionId === sessionId
  }

  const getSessionClassName = (sessionId: string) => {
    const baseClass =
      'bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl p-6 hover:bg-white/90 hover:border-indigo-300/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer group'

    if (isHighlighted(sessionId)) {
      return `${baseClass} ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/90 ${
        highlightPulse === sessionId ? 'animate-pulse' : ''
      }`
    }

    return baseClass
  }

  const getStatusBadgeClass = (status: string) => {
    const baseClass =
      'px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200'

    switch (status) {
      case 'active':
        return `${baseClass} bg-green-100 text-green-800 border-green-200 group-hover:bg-green-200 animate-pulse`
      case 'scheduled':
        return `${baseClass} bg-blue-100 text-blue-800 border-blue-200 group-hover:bg-blue-200`
      case 'completed':
        return `${baseClass} bg-gray-100 text-gray-800 border-gray-200 group-hover:bg-gray-200`
      case 'cancelled':
        return `${baseClass} bg-red-100 text-red-800 border-red-200 group-hover:bg-red-200`
      default:
        return `${baseClass} bg-gray-100 text-gray-800 border-gray-200`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Quiz Sessions</h2>
          {canManage && (
            <button
              onClick={onCreateSession}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="h-5 w-5" />
              New Session
            </button>
          )}
        </div>

        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-gray-200"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Quiz Sessions</h2>
          {canManage && (
            <button
              onClick={onCreateSession}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="h-5 w-5" />
              New Session
            </button>
          )}
        </div>

        <div className="py-8 text-center text-red-600">
          <p>Failed to load sessions: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quiz Sessions</h2>
          {highlightSessionId && (
            <p className="mt-1 text-sm text-indigo-600">✨ New session highlighted below</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={checkExpiredSessions}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-all hover:bg-gray-200"
          >
            <Calendar className="h-4 w-4" />
            Refresh Status
          </button>
          {canManage && (
            <button
              onClick={onCreateSession}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="h-5 w-5" />
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'scheduled', 'active', 'completed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilters({ status })}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              filters.status === status
                ? 'bg-indigo-600 text-white'
                : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            {status === 'all' ? 'All Sessions' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="rounded-xl border border-white/40 bg-white/60 py-12 text-center backdrop-blur-sm">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-800">No sessions yet</h3>
            <p className="mb-4 text-gray-600">Create your first quiz session to get started!</p>
            {canManage && (
              <button
                onClick={onCreateSession}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create Session
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session: any) => (
            <div key={session.id} className={getSessionClassName(session.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    {getSessionTypeIcon(session.session_type)}
                    <h3 className="font-semibold text-gray-900">{session.title}</h3>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${getStatusColor(session.status)}`}
                    >
                      {session.status}
                    </span>
                    {isHighlighted(session.id) && (
                      <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                        ✨ New
                      </span>
                    )}
                  </div>

                  {session.video_title && (
                    <p className="mb-2 text-sm text-gray-600">📺 {session.video_title}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Created {formatDate(session.created_at)}</span>
                    {session.scheduled_at && (
                      <span>Scheduled for {formatDate(session.scheduled_at)}</span>
                    )}
                  </div>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  {session.status === 'active' && (
                    <button
                      onClick={() => handleJoinSession(session)}
                      disabled={joiningSession === session.id}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      {joiningSession === session.id ? 'Checking...' : 'Join'}
                    </button>
                  )}

                  {session.status === 'scheduled' && (
                    <button
                      onClick={() => handleJoinSession(session)}
                      disabled={joiningSession === session.id}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      {joiningSession === session.id ? 'Checking...' : 'Enter Room'}
                    </button>
                  )}

                  {canManage && (
                    <>
                      <button
                        onClick={() => setEditingSession(session)}
                        className="rounded-lg p-2 text-gray-500 transition-all hover:bg-white/80 hover:text-indigo-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(session.id)}
                        className="rounded-lg p-2 text-gray-500 transition-all hover:bg-white/80 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quiz Room Modal */}
      {quizRoomSession && (
        <GroupQuizRoomModal
          isOpen={true}
          onClose={() => setQuizRoomSession(null)}
          sessionId={quizRoomSession.id}
          groupId={groupId}
          session={quizRoomSession}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <FullscreenModal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          className="w-full max-w-md"
          closeOnBackdropClick={false}
        >
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Delete Session</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </FullscreenModal>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          groupId={groupId}
          canEdit={canManage}
          onClose={() => setEditingSession(null)}
          onSave={async () => {}}
        />
      )}
    </div>
  )
}
