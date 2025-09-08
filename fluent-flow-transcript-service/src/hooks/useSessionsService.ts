import { useCallback, useMemo } from 'react'
import { SessionsService, type BulkDeleteResult } from '../lib/services/sessions-service'

export function useSessionsService(groupId: string) {
  // Create service instance once per groupId
  const sessionsService = useMemo(
    () => new SessionsService({ groupId }),
    [groupId]
  )

  // Memoize service methods to prevent unnecessary re-renders
  const bulkDeleteSessions = useCallback(
    async (sessionIds: string[]): Promise<BulkDeleteResult> => {
      return sessionsService.bulkDeleteSessions(sessionIds)
    },
    [sessionsService]
  )

  const approveSession = useCallback(
    async (sessionId: string): Promise<void> => {
      return sessionsService.approveSession(sessionId)
    },
    [sessionsService]
  )

  const rejectSession = useCallback(
    async (sessionId: string): Promise<void> => {
      return sessionsService.rejectSession(sessionId)
    },
    [sessionsService]
  )

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      return sessionsService.deleteSession(sessionId)
    },
    [sessionsService]
  )

  return {
    bulkDeleteSessions,
    approveSession,
    rejectSession,
    deleteSession
  }
}