import { useState } from 'react'
import { Plus, Calendar, Clock, Users, Play, Eye, Trash2, Edit3, UserCheck } from 'lucide-react'
import { useGroupSessions } from '../../hooks/useGroupSessions'
import EditSessionModal from '../groups/EditSessionModal'
import { GroupQuizRoomModal } from '../../app/groups/[groupId]/components/sessions/GroupQuizRoomModal'

interface SessionsTabProps {
  groupId: string
  canManage: boolean
  onCreateSession: () => void
}

interface SessionFilters {
  status: 'all' | 'scheduled' | 'active' | 'completed' | 'cancelled'
}

export default function SessionsTab({ groupId, canManage, onCreateSession }: SessionsTabProps) {
  const { sessions, loading, error, deleteSession } = useGroupSessions(groupId)
  const [filters, setFilters] = useState<SessionFilters>({ status: 'all' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<any | null>(null)
  const [quizRoomSession, setQuizRoomSession] = useState<any | null>(null)

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

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'scheduled', 'active', 'completed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilters({ status })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filters.status === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                {sessions.filter(s => s.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
            <p className="mb-4">Create your first quiz session to get started</p>
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
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getSessionTypeIcon(session.session_type)}
                      <h3 className="text-lg font-semibold text-gray-800">{session.title}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                  
                  {session.video_title && (
                    <p className="text-gray-600 mb-2">{session.video_title}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{session.participant_count} participants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {session.scheduled_at && formatDate(session.scheduled_at)}
                      </span>
                    </div>
                    {session.questions_count > 0 && (
                      <div className="flex items-center gap-1">
                        <span>{session.questions_count} questions</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quiz Room Button */}
                  <button
                    onClick={() => setQuizRoomSession(session)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Join quiz room to see other participants"
                  >
                    <UserCheck className="w-4 h-4" />
                    Quiz Room
                  </button>

                  {/* Join/View Session Button */}
                  {session.share_token && (
                    <button
                      onClick={() => {
                        const url = `/questions/${session.share_token}?groupId=${groupId}&sessionId=${session.id}`
                        window.open(url, '_blank')
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {session.status === 'active' ? (
                        <>
                          <Play className="w-4 h-4" />
                          Join Quiz
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          View Results
                        </>
                      )}
                    </button>
                  )}

                  {/* Management Buttons */}
                  {canManage && (
                    <>
                      <button
                        onClick={() => setEditingSession(session)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit session"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(session.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete session"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Session</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
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
        </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          groupId={groupId}
          canEdit={canManage}
          onClose={() => setEditingSession(null)}
          onSave={async (updatedSession) => {
            try {
              // Call API to update session
              const response = await fetch(`/api/groups/${groupId}/sessions/${editingSession.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedSession)
              })
              
              if (response.ok) {
                // Refresh sessions list - you might want to add a refresh function to useGroupSessions
                window.location.reload() // Simple refresh for now
              } else {
                throw new Error('Failed to update session')
              }
            } catch (error) {
              console.error('Error updating session:', error)
              throw error
            }
          }}
        />
      )}

      {/* Group Quiz Room Modal */}
      {quizRoomSession && (
        <GroupQuizRoomModal
          isOpen={true}
          onClose={() => setQuizRoomSession(null)}
          sessionId={quizRoomSession.id}
          groupId={groupId}
          session={{
            id: quizRoomSession.id,
            quiz_title: quizRoomSession.title,
            video_title: quizRoomSession.video_title,
            video_url: quizRoomSession.video_url,
            scheduled_at: quizRoomSession.scheduled_at,
            status: quizRoomSession.status,
            quiz_token: quizRoomSession.share_token,
            created_by: quizRoomSession.created_by,
            questions_data: quizRoomSession.questions_data
          }}
        />
      )}
    </div>
  )
}