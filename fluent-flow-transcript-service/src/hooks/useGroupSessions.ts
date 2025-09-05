import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQuizAuth } from '../lib/hooks/use-quiz-auth'
import { getAuthHeaders } from '../lib/supabase/auth-utils'

interface GroupSession {
  id: string
  title: string
  description?: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  scheduled_at?: string
  created_at: string
  updated_at: string
  quiz_title?: string
  participant_count?: number
  completion_rate?: number
}

interface SessionDetails extends GroupSession {
  share_token?: string
  started_at?: string
  ended_at?: string
  questions?: any
  loop?: any
  results?: any[]
}

export function useGroupSessions(groupId: string) {
  const { user, isAuthenticated } = useQuizAuth()
  const queryClient = useQueryClient()

  // React Query for fetching sessions
  const {
    data: sessions = [],
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['group-sessions', groupId, isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated || !user) {
        return []
      }

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()
      return data.sessions || []
    },
    enabled: !!(groupId && isAuthenticated && user),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
    refetchOnWindowFocus: true, // Good for sessions - user might want fresh data
    refetchOnReconnect: true,
    retry: 2
  })

  const error = queryError?.message || null

  // Fetch sessions with optional status filter
  const fetchSessions = useCallback(
    async (status?: string) => {
      if (!isAuthenticated || !user) return

      try {
        const headers = await getAuthHeaders()
        const url = new URL(`/api/groups/${groupId}/sessions`, window.location.origin)
        if (status) url.searchParams.set('status', status)

        const response = await fetch(url.toString(), {
          headers
        })

        if (!response.ok) {
          throw new Error('Failed to fetch sessions')
        }

        const data = await response.json()

        // Update the cache with filtered results
        queryClient.setQueryData(['group-sessions', groupId, isAuthenticated], data.sessions || [])

        return data.sessions || []
      } catch (err) {
        console.error('Error fetching sessions:', err)
        throw err
      }
    },
    [groupId, isAuthenticated, user, queryClient]
  )

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: {
      title: string
      description?: string
      scheduledAt?: string
      questions?: any
      shareToken?: string
      loopData?: any
      notifyMembers?: boolean
      sessionType?: 'instant' | 'scheduled'
    }) => {
      if (!isAuthenticated) throw new Error('Not authenticated')

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(sessionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const result = await response.json()
      return result.session
    },
    onSuccess: () => {
      // Invalidate and refetch sessions
      queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] })
    }
  })

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({
      sessionId,
      updates
    }: {
      sessionId: string
      updates: {
        scheduledAt?: string
        status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
        title?: string
      }
    }) => {
      if (!isAuthenticated) throw new Error('Not authenticated')

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update session')
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] })
    }
  })

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!isAuthenticated) throw new Error('Not authenticated')

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete session')
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] })
    }
  })

  // Check expired sessions mutation
  const checkExpiredSessionsMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) return

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/expired`, {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to check expired sessions')
      }

      const result = await response.json()
      return result
    },
    onSuccess: result => {
      if (result?.expiredSessionIds?.length > 0) {
        // Invalidate sessions cache if any were updated
        queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] })
      }
    },
    onError: error => {
      console.error('Error checking expired sessions:', error)
    }
  })

  // Get session details with caching
  const getSessionDetails = useCallback(
    async (sessionId: string): Promise<SessionDetails> => {
      if (!isAuthenticated) throw new Error('Not authenticated')

      // Check if we have this session detail cached
      const cachedDetails = queryClient.getQueryData(['session-details', sessionId])
      if (cachedDetails) {
        return cachedDetails as SessionDetails
      }

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch session details')
      }

      const data = await response.json()

      // Cache the session details
      queryClient.setQueryData(['session-details', sessionId], data.session, {
        updatedAt: Date.now()
        // staleTime: 5 * 60 * 1000 // Cache for 5 minutes
      })

      return data.session
    },
    [groupId, isAuthenticated, queryClient]
  )

  // Convenience functions that use mutations
  const createSession = useCallback(
    async (sessionData: Parameters<typeof createSessionMutation.mutateAsync>[0]) => {
      return await createSessionMutation.mutateAsync(sessionData)
    },
    [createSessionMutation]
  )

  const updateSession = useCallback(
    async (
      sessionId: string,
      updates: Parameters<typeof updateSessionMutation.mutateAsync>[0]['updates']
    ) => {
      return await updateSessionMutation.mutateAsync({ sessionId, updates })
    },
    [updateSessionMutation]
  )

  const deleteSession = useCallback(
    async (sessionId: string) => {
      return await deleteSessionMutation.mutateAsync(sessionId)
    },
    [deleteSessionMutation]
  )

  // Check single session expired mutation
  const checkSingleSessionExpiredMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!isAuthenticated) return

      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/check-expired`, {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to check session expired status')
      }

      const result = await response.json()
      return result
    },
    onSuccess: result => {
      if (result?.wasUpdated) {
        // Invalidate sessions cache if session was updated
        queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] })
      }
    },
    onError: error => {
      console.error('Error checking single session expired:', error)
    }
  })

  const checkSingleSessionExpired = useCallback(
    async (sessionId: string) => {
      return await checkSingleSessionExpiredMutation.mutateAsync(sessionId)
    },
    [checkSingleSessionExpiredMutation]
  )

  // // Check expired sessions on mount and visibility change
  // useEffect(() => {
  //   if (groupId && isAuthenticated) {
  //     // Check expired sessions when component mounts
  //     checkExpiredSessions()
  //   }
  // }, [groupId, isAuthenticated])

  // // Check expired sessions when window becomes visible
  // useEffect(() => {
  //   if (!groupId || !isAuthenticated) return

  //   const handleVisibilityChange = () => {
  //     if (!document.hidden) {
  //       // Window became visible, check for expired sessions
  //       checkExpiredSessions()
  //     }
  //   }

  //   document.addEventListener('visibilitychange', handleVisibilityChange)

  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange)
  //   }
  // }, [groupId, isAuthenticated])

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    getSessionDetails,
    updateSession,
    deleteSession,
    checkSingleSessionExpired,
    refetch,
    // Expose loading states for mutations
    isCreating: createSessionMutation.isPending,
    isUpdating: updateSessionMutation.isPending,
    isDeleting: deleteSessionMutation.isPending,
    isCheckingExpired: checkExpiredSessionsMutation.isPending,
    isCheckingSingleExpired: checkSingleSessionExpiredMutation.isPending
  }
}
