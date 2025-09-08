import { useEffect, useState } from 'react'
import { Calendar, CheckCircle, Clock, Edit, Play, Plus, Trash2, XCircle } from 'lucide-react'
import { useSessionsService } from '../../hooks/useSessionsService'
import { GroupQuizResultsModal } from '../../app/groups/[groupId]/components/GroupQuizResultsModal'
import { GroupQuizRoomModal } from '../../app/groups/[groupId]/components/sessions/GroupQuizRoomModal'
import { useGroupSessions } from '../../hooks/useGroupSessions'
import EditSessionModal from '../groups/EditSessionModal'
import { GlobalSessionListener } from '../groups/quiz/GlobalSessionListener'
import { FullscreenModal } from '../ui/dialog'
import { SessionDetailsModal } from './SessionDetailsModal'

interface SessionsTabProps {
  groupId: string
  canManage: boolean
  canDeleteSessions?: boolean
  canManageQuiz?: boolean // Add quiz management permission
  onCreateSession: () => void
  highlightSessionId?: string
}

interface SessionFilters {
  status: 'all' | 'pending' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'expired'
}

export default function SessionsTab({
  groupId,
  canManage,
  canDeleteSessions,
  canManageQuiz = false,
  onCreateSession,
  highlightSessionId
}: SessionsTabProps) {
  const { sessions, loading, error, checkSingleSessionExpired, refetch } =
    useGroupSessions(groupId)
  const sessionsService = useSessionsService(groupId)
  const [filters, setFilters] = useState<SessionFilters>({ status: 'all' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<any | null>(null)
  const [quizRoomSession, setQuizRoomSession] = useState<any | null>(null)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [detailsSession, setDetailsSession] = useState<any | null>(null)
  const [highlightPulse, setHighlightPulse] = useState<string | null>(highlightSessionId || null)
  const [joiningSession, setJoiningSession] = useState<string | null>(null)

  // 🆕 Bulk delete states
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Remove highlight pulse after animation
  useEffect(() => {
    if (highlightSessionId) {
      const timer = setTimeout(() => {
        setHighlightPulse(null)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [highlightSessionId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-200'
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

  const filteredSessions = sessions.filter((session: any) => {
    if (filters.status === 'all') return true
    if (filters.status === 'expired') return session.is_likely_expired
    return session.status === filters.status
  })

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await sessionsService.deleteSession(sessionId)
      setDeleteConfirm(null)
      await refetch()
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // 🆕 Bulk delete functions
  const handleSelectSession = (sessionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSessions)
    if (checked) {
      newSelected.add(sessionId)
    } else {
      newSelected.delete(sessionId)
    }
    setSelectedSessions(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableSessions = filteredSessions.filter(
        (session: any) => session.status !== 'active' // Don't select active sessions
      )
      setSelectedSessions(new Set(selectableSessions.map((s: any) => s.id)))
    } else {
      setSelectedSessions(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedSessions.size === 0) return

    setBulkDeleteLoading(true)
    try {
      const sessionIds = Array.from(selectedSessions)
      const result = await sessionsService.bulkDeleteSessions(sessionIds)

      console.log('Bulk delete successful:', result)

      // Reset states and refresh
      setSelectedSessions(new Set())
      setBulkDeleteConfirm(false)
      setIsSelectionMode(false)
      await refetch()
    } catch (err) {
      console.error('Bulk delete failed:', err)
      alert(`Failed to delete sessions: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  const handleApproveSession = async (sessionId: string) => {
    try {
      await sessionsService.approveSession(sessionId)
      
      // Refresh sessions list
      await refetch()
    } catch (err) {
      console.error('Failed to approve session:', err)
    }
  }

  const handleRejectSession = async (sessionId: string) => {
    try {
      await sessionsService.rejectSession(sessionId)
      
      // Refresh sessions list
      await refetch()
    } catch (err) {
      console.error('Failed to reject session:', err)
    }
  }

  const handleJoinSession = async (session: any) => {
    setJoiningSession(session.id)

    try {
      // Only check expired status for this specific session if it's likely expired
      if (session.is_likely_expired) {
        const result = await checkSingleSessionExpired(session.id)
        if (result?.isExpired) {
          // Session is expired, don't open quiz room
          console.log('Session is expired and has been updated')
          return
        }
      }
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

  // Helper function to determine if session should have View Results button
  const shouldShowViewResults = (session: any) => {
    return (
      session.status === 'completed' || (session.status === 'active' && session.result_count > 0)
    )
  }

  // Enhanced refresh function with user feedback
  const handleRefreshSessions = async () => {
    try {
      // Simply refetch sessions - the API will return updated expired status
      await refetch()
      console.log('Sessions refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh sessions:', error)
      // Could show error toast here
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

  // Get currently active session for global listening
  const activeSession = sessions.find((session: any) => session.status === 'active')

  return (
    <div className="space-y-6">
      {/* Global Session Listener - listens for quiz starts when user is not in room */}
      <GlobalSessionListener
        groupId={groupId}
        activeSessionId={activeSession?.id}
        isInQuizRoom={!!quizRoomSession}
      />

      {/* Header with Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Quiz Sessions</h2>

          {/* 🆕 Bulk Actions */}
          {canDeleteSessions && filteredSessions.length > 0 && (
            <div className="flex items-center gap-2">
              {!isSelectionMode ? (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  <CheckCircle className="h-4 w-4" />
                  Select
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedSessions.size} selected
                  </span>
                  {selectedSessions.size > 0 && (
                    <button
                      onClick={() => setBulkDeleteConfirm(true)}
                      disabled={bulkDeleteLoading}
                      className="inline-flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete ({selectedSessions.size})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsSelectionMode(false)
                      setSelectedSessions(new Set())
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
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

      {/* 🆕 Bulk Select All */}
      {isSelectionMode && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <input
            type="checkbox"
            checked={
              selectedSessions.size ===
              filteredSessions.filter((s: any) => s.status !== 'active').length
            }
            onChange={e => handleSelectAll(e.target.checked)}
            className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm font-medium text-blue-700">
            Select all ({filteredSessions.filter((s: any) => s.status !== 'active').length}{' '}
            sessions)
          </label>
          <span className="text-xs text-blue-600">(Active sessions cannot be selected)</span>
        </div>
      )}

      {/* Filter Section */}
      <div className="flex flex-wrap gap-2">
        {(
          ['all', 'pending', 'scheduled', 'active', 'completed', 'cancelled', 'expired'] as const
        ).map(status => (
          <button
            key={status}
            onClick={() => setFilters({ status })}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filters.status === status
                ? 'bg-indigo-600 text-white'
                : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 text-xs opacity-75">
                (
                {
                  sessions.filter((s: any) =>
                    status === 'expired' ? s.is_likely_expired : s.status === status
                  ).length
                }
                )
              </span>
            )}
          </button>
        ))}

        <button
          onClick={handleRefreshSessions}
          className="rounded-lg bg-white/60 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white/80"
        >
          Refresh
        </button>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="py-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No sessions {filters.status !== 'all' ? `with status "${filters.status}"` : ''} yet
          </h3>
          <p className="text-gray-500">
            {canManage
              ? 'Create your first quiz session to get started.'
              : 'Sessions will appear here when they are created.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session: any) => {
            const isSessionSelected = selectedSessions.has(session.id)
            const canSelectSession = session.status !== 'active'

            return (
              <div
                key={session.id}
                className={`${getSessionClassName(session.id)} ${
                  isSelectionMode ? 'pl-4' : ''
                } ${isSessionSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-center gap-4">
                  {/* 🆕 Checkbox for selection mode */}
                  {isSelectionMode && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSessionSelected}
                        disabled={!canSelectSession}
                        onChange={e => handleSelectSession(session.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>
                  )}

                  {/* Rest of session card content remains the same */}
                  <div className="flex-grow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-2 sm:mb-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                            {session.session_name || session.title || session.video_title || 'Untitled Session'}
                          </h3>
                          <span
                            className={`rounded-full border px-3 py-1 text-sm font-medium ${getStatusColor(session.status)}`}
                          >
                            {session.is_likely_expired ? 'Expired' : session.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            {getSessionTypeIcon(session.session_type)}
                            {session.session_type}
                          </div>
                          <span>Created {formatDate(session.created_at)}</span>
                          {session.scheduled_for && (
                            <span>Scheduled for {formatDate(session.scheduled_for)}</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons remain the same */}
                      <div className="flex items-center gap-2">
                        {session.status === 'pending' && canManage && (
                          <>
                            <button
                              onClick={() => handleApproveSession(session.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectSession(session.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </>
                        )}

                        {session.status === 'active' && (
                          <button
                            onClick={() => handleJoinSession(session)}
                            disabled={joiningSession === session.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                          >
                            {joiningSession === session.id ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Joining...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                Join Quiz
                              </>
                            )}
                          </button>
                        )}

                        {shouldShowViewResults(session) && (
                          <button
                            onClick={() => setSelectedSession(session)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
                          >
                            View Results
                          </button>
                        )}

                        <button
                          onClick={() => setDetailsSession(session)}
                          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          Details
                        </button>

                        {canManage && (
                          <button
                            onClick={() => setEditingSession(session)}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                        )}

                        {canDeleteSessions && session.status !== 'active' && !isSelectionMode && (
                          <button
                            onClick={() => setDeleteConfirm(session.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 🆕 Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <FullscreenModal isOpen={true} onClose={() => setBulkDeleteConfirm(false)}>
          <div className="mx-auto max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Confirm Bulk Delete</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete {selectedSessions.size} sessions? This will also
              remove:
            </p>
            <ul className="mb-6 space-y-1 text-sm text-gray-500">
              <li>• Quiz progress records</li>
              <li>• Quiz results</li>
              <li>• Session participants</li>
              <li>• Progress events</li>
              <li className="text-green-600">✓ Questions will be preserved for reuse</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkDeleteLoading}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleteLoading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Delete {selectedSessions.size} Sessions
              </button>
            </div>
          </div>
        </FullscreenModal>
      )}

      {/* Individual Delete Confirmation Modal */}
      {deleteConfirm && (
        <FullscreenModal isOpen={true} onClose={() => setDeleteConfirm(null)}>
          <div className="mx-auto max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Confirm Delete</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </FullscreenModal>
      )}

      {/* Existing Modals */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          groupId={groupId}
          canEdit={canManage}
          onClose={() => setEditingSession(null)}
          onSave={async () => {
            setEditingSession(null)
            await refetch()
          }}
        />
      )}

      {quizRoomSession && (
        <GroupQuizRoomModal
          isOpen={true}
          sessionId={quizRoomSession.id}
          groupId={groupId}
          session={quizRoomSession}
          canManageQuiz={canManageQuiz}
          onClose={() => setQuizRoomSession(null)}
        />
      )}

      {selectedSession && (
        <GroupQuizResultsModal
          isOpen={true}
          sessionId={selectedSession.id}
          sessionTitle={selectedSession.session_name || selectedSession.video_title}
          groupId={groupId}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {detailsSession && (
        <SessionDetailsModal
          isOpen={true}
          session={detailsSession}
          groupId={groupId}
          canManage={canManage}
          onClose={() => setDetailsSession(null)}
          onEdit={session => {
            setDetailsSession(null)
            setEditingSession(session)
          }}
          onJoin={session => {
            setDetailsSession(null)
            handleJoinSession(session)
          }}
          onViewResults={session => {
            setDetailsSession(null)
            setSelectedSession(session)
          }}
        />
      )}
    </div>
  )
}
