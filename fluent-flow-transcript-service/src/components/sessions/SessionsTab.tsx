import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, Play, Trash2, Edit } from 'lucide-react'
import { useGroupSessions } from '../../hooks/useGroupSessions'
import EditSessionModal from '../groups/EditSessionModal'
import { GroupQuizRoomModal } from '../../app/groups/[groupId]/components/sessions/GroupQuizRoomModal'
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

export default function SessionsTab({ groupId, canManage, onCreateSession, highlightSessionId }: SessionsTabProps) {
  const { sessions, loading, error, deleteSession, checkExpiredSessions } = useGroupSessions(groupId)
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
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'instant': return <Play className="w-4 h-4" />
      case 'scheduled': return <Calendar className="w-4 h-4" />
      case 'recurring': return <Clock className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
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

  const filteredSessions = sessions.filter(session => 
    filters.status === 'all' || session.status === filters.status
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
    const baseClass = "bg-white/80 backdrop-blur-sm border border-white/40 rounded-xl p-6 hover:bg-white/90 hover:border-indigo-300/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer group"
    
    if (isHighlighted(sessionId)) {
      return `${baseClass} ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/90 ${
        highlightPulse === sessionId ? 'animate-pulse' : ''
      }`
    }
    
    return baseClass
  }

  const getStatusBadgeClass = (status: string) => {
    const baseClass = "px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200"
    
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Session
            </button>
          )}
        </div>
        
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Session
            </button>
          )}
        </div>
        
        <div className="text-center py-8 text-red-600">
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
            <p className="text-sm text-indigo-600 mt-1">
              ✨ New session highlighted below
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={checkExpiredSessions}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
          >
            <Calendar className="w-4 h-4" />
            Refresh Status
          </button>
          {canManage && (
            <button
              onClick={onCreateSession}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'scheduled', 'active', 'completed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilters({ status })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
          <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              No sessions yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first quiz session to get started!
            </p>
            {canManage && (
              <button
                onClick={onCreateSession}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Session
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map(session => (
            <div
              key={session.id}
              className={getSessionClassName(session.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getSessionTypeIcon(session.session_type)}
                    <h3 className="font-semibold text-gray-900">{session.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    {isHighlighted(session.id) && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        ✨ New
                      </span>
                    )}
                  </div>
                  
                  {session.video_title && (
                    <p className="text-sm text-gray-600 mb-2">📺 {session.video_title}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Created {formatDate(session.created_at)}</span>
                    {session.scheduled_at && (
                      <span>Scheduled for {formatDate(session.scheduled_at)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {session.status === 'active' && (
                    <button 
                      onClick={() => handleJoinSession(session)}
                      disabled={joiningSession === session.id}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                      {joiningSession === session.id ? 'Checking...' : 'Join'}
                    </button>
                  )}
                  
                  {session.status === 'scheduled' && (
                    <button 
                      onClick={() => handleJoinSession(session)}
                      disabled={joiningSession === session.id}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" />
                      {joiningSession === session.id ? 'Checking...' : 'Enter Room'}
                    </button>
                  )}
                  
                  {canManage && (
                    <>
                      <button
                        onClick={() => setEditingSession(session)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white/80 rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(session.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-white/80 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
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
          className="max-w-md w-full"
          closeOnBackdropClick={false}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Session</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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