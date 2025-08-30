import { QueryClient } from '@tanstack/react-query'

let queryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
          retry: (failureCount, error) => {
            // Don't retry for client errors (4xx)
            if (error instanceof Error && 'status' in error) {
              const status = (error as any).status
              if (status >= 400 && status < 500) {
                return false
              }
            }
            return failureCount < 3
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
          retry: 1,
          retryDelay: 1000,
        },
      },
    })
  }
  return queryClient
}

// Reset the query client (useful for testing)
export function resetQueryClient(): void {
  queryClient = undefined
}

// Query keys for consistent caching
export const queryKeys = {
  transcripts: {
    all: ['transcripts'] as const,
    byVideo: (videoId: string) => ['transcripts', 'video', videoId] as const,
    bySegment: (videoId: string, startTime: number, endTime: number) => 
      ['transcripts', 'segment', videoId, startTime, endTime] as const,
  },
  questions: {
    all: ['questions'] as const,
    bySegment: (segmentId: string) => ['questions', 'segment', segmentId] as const,
    byUser: (userId: string) => ['questions', 'user', userId] as const,
    generate: (loopId: string) => ['questions', 'generate', loopId] as const,
  },
  loops: {
    all: ['loops'] as const,
    bySession: (sessionId: string) => ['loops', 'session', sessionId] as const,
    byId: (loopId: string) => ['loops', 'id', loopId] as const,
  },
  vocabulary: {
    all: ['vocabulary'] as const,
    deck: (limit?: number) => ['vocabulary', 'deck', limit] as const,
    byId: (id: string) => ['vocabulary', 'id', id] as const,
  },
  contextualLearning: {
    all: ['contextual-learning'] as const,
    contextualData: (wordId: string, wordText: string) => ['contextual-learning', 'contextual-data', wordId, wordText] as const,
    examples: (wordId: string, wordText: string) => ['contextual-learning', 'examples', wordId, wordText] as const,
    collocations: (wordId: string, wordText: string) => ['contextual-learning', 'collocations', wordId, wordText] as const,
    contexts: (wordId: string, wordText: string) => ['contextual-learning', 'contexts', wordId, wordText] as const,
  }
} as const