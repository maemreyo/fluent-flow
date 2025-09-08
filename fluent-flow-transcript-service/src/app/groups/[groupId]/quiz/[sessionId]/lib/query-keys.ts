/**
 * Centralized Query Key Factory for Quiz Flow
 * This ensures consistency and prevents duplicate queries
 */

export const quizQueryKeys = {
  // Base keys
  all: ['quiz'] as const,
  groups: () => [...quizQueryKeys.all, 'groups'] as const,
  sessions: () => [...quizQueryKeys.all, 'sessions'] as const,
  questions: () => [...quizQueryKeys.all, 'questions'] as const,
  results: () => [...quizQueryKeys.all, 'results'] as const,
  participants: () => [...quizQueryKeys.all, 'participants'] as const,

  // Group-specific keys
  group: (groupId: string) => [...quizQueryKeys.groups(), groupId] as const,
  groupDetail: (groupId: string) => [...quizQueryKeys.group(groupId), 'detail'] as const,
  groupSessions: (groupId: string) => [...quizQueryKeys.group(groupId), 'sessions'] as const,

  // Session-specific keys
  session: (groupId: string, sessionId: string) => 
    [...quizQueryKeys.sessions(), groupId, sessionId] as const,
  sessionDetail: (groupId: string, sessionId: string) => 
    [...quizQueryKeys.session(groupId, sessionId), 'detail'] as const,
  sessionParticipants: (groupId: string, sessionId: string) => 
    [...quizQueryKeys.session(groupId, sessionId), 'participants'] as const,
  sessionProgress: (sessionId: string) =>
    [...quizQueryKeys.sessions(), sessionId, 'progress'] as const,

  // Questions-specific keys
  sessionQuestions: (groupId: string, sessionId: string) =>
    [...quizQueryKeys.session(groupId, sessionId), 'questions'] as const,
  questionSet: (token: string) => [...quizQueryKeys.questions(), 'set', token] as const,
  questionSetByDifficulty: (groupId: string, sessionId: string) =>
    [...quizQueryKeys.sessionQuestions(groupId, sessionId), 'by-difficulty'] as const,

  // Results-specific keys
  sessionResults: (groupId: string, sessionId: string) =>
    [...quizQueryKeys.session(groupId, sessionId), 'results'] as const,
  existingResults: (groupId: string, sessionId: string, isAuthenticated: boolean) =>
    [...quizQueryKeys.sessionResults(groupId, sessionId), 'existing', isAuthenticated] as const,
  groupResults: (groupId: string, sessionId: string) =>
    [...quizQueryKeys.sessionResults(groupId, sessionId), 'leaderboard'] as const,

  // User-specific keys
  userFavorites: (token: string) => [...quizQueryKeys.questions(), 'favorites', token] as const,
  userProgress: (sessionId: string, userId?: string) =>
    [...quizQueryKeys.sessionProgress(sessionId), 'user', userId] as const,

  // Loop-specific keys (for question generation)
  loops: (groupId: string) => [...quizQueryKeys.group(groupId), 'loops'] as const,
  loop: (groupId: string, loopId: string) => [...quizQueryKeys.loops(groupId), loopId] as const,

  // Preset-specific keys
  presets: (groupId: string, sessionId: string) =>
    [...quizQueryKeys.session(groupId, sessionId), 'presets'] as const,
  currentPreset: (groupId: string, sessionId: string) =>
    [...quizQueryKeys.presets(groupId, sessionId), 'current'] as const
} as const

/**
 * Query options factory with optimized defaults
 */
export const quizQueryOptions = {
  // Short-lived data (frequently changing)
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  },
  
  // Medium-lived data (occasionally changing)
  session: {
    staleTime: 2 * 60 * 1000, // 2 minutes  
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Long-lived data (rarely changing)
  static: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Questions data (changes only when regenerated) - OPTIMIZED for cross-page caching
  questions: {
    staleTime: 30 * 60 * 1000, // 30 minutes - extended to prevent refetching across pages
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // CRITICAL: Don't refetch on mount if data exists
  },

  // Results data (immutable once created)
  results: {
    staleTime: Infinity, // Never stale once loaded
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  }
} as const

/**
 * Helper function to invalidate related queries
 */
export const invalidateQuizQueries = (queryClient: any, groupId: string, sessionId: string) => {
  // Invalidate session-related queries
  queryClient.invalidateQueries({
    queryKey: quizQueryKeys.session(groupId, sessionId)
  })
  
  // Invalidate participants
  queryClient.invalidateQueries({
    queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
  })
  
  // Invalidate results
  queryClient.invalidateQueries({
    queryKey: quizQueryKeys.sessionResults(groupId, sessionId)
  })
}

/**
 * Helper function to prefetch common queries
 */
export const prefetchQuizQueries = async (queryClient: any, groupId: string, sessionId: string) => {
  // Pre-fetch session participants (likely needed)
  queryClient.prefetchQuery({
    queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId),
    staleTime: quizQueryOptions.session.staleTime,
  })
  
  // Pre-fetch session questions (likely needed)
  queryClient.prefetchQuery({
    queryKey: quizQueryKeys.sessionQuestions(groupId, sessionId),
    staleTime: quizQueryOptions.questions.staleTime,
  })
}