import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../services/query-client'
import { supabaseService } from '../stores/fluent-flow-supabase-store'
import { youtubeTranscriptService } from '../services/youtube-transcript-service'

export interface TranscriptData {
  id: string
  segments: any[]
  fullText: string
  language: string
}

export interface TranscriptQueryResult {
  segments: any[]
  fullText: string
  videoId: string
  language?: string
}

export function useTranscriptQuery(
  videoId: string,
  startTime: number,
  endTime: number,
  language?: string
) {
  return useQuery({
    queryKey: queryKeys.transcripts.bySegment(videoId, startTime, endTime),
    queryFn: async (): Promise<TranscriptQueryResult> => {
      console.log(`useTranscriptQuery: Fetching transcript for ${videoId} (${startTime}s-${endTime}s)`)
      
      // First, check if transcript exists in database
      const cachedTranscript = await supabaseService.getTranscript(videoId, startTime, endTime)
      
      if (cachedTranscript) {
        console.log('useTranscriptQuery: Found cached transcript in database')
        return {
          segments: cachedTranscript.segments,
          fullText: cachedTranscript.fullText,
          videoId,
          language: cachedTranscript.language
        }
      }

      console.log('useTranscriptQuery: No cached transcript found, fetching from server')
      
      // If not cached, fetch from transcript server
      const transcriptResult = await youtubeTranscriptService.getTranscriptSegment(
        videoId,
        startTime,
        endTime,
        language
      )

      // Save to database for future use
      try {
        const transcriptId = await supabaseService.saveTranscript(
          videoId,
          startTime,
          endTime,
          transcriptResult.segments,
          transcriptResult.fullText,
          transcriptResult.language
        )
        console.log(`useTranscriptQuery: Saved transcript with ID: ${transcriptId}`)
      } catch (error) {
        console.error('useTranscriptQuery: Failed to save transcript to database:', error)
        // Don't throw here - we still have the transcript data
      }

      return transcriptResult
    },
    enabled: Boolean(videoId && startTime !== null && endTime !== null),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - transcripts don't change
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: (failureCount, error) => {
      // Don't retry for video not found or transcript not available
      if (error && typeof error === 'object') {
        const errorMessage = error.message || String(error)
        if (errorMessage.includes('VIDEO_NOT_FOUND') || 
            errorMessage.includes('NOT_AVAILABLE') || 
            errorMessage.includes('PRIVATE_VIDEO') ||
            errorMessage.includes('Transcript server not configured')) {
          return false
        }
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000), // Cap at 8 seconds
    throwOnError: false // Let components handle errors gracefully
  })
}

/**
 * Hook for fetching transcripts using ConversationLoopIntegrationService
 * This provides the full transcript fetching flow with enhanced caching
 */
export function useTranscriptWithIntegrationQuery(
  videoId: string,
  startTime: number,
  endTime: number,
  integrationService: any, // ConversationLoopIntegrationService
  language?: string
) {
  return useQuery({
    queryKey: queryKeys.transcripts.bySegment(videoId, startTime, endTime),
    queryFn: async (): Promise<TranscriptQueryResult> => {
      console.log(`useTranscriptWithIntegrationQuery: Fetching transcript via integration service for ${videoId}`)
      
      if (!integrationService) {
        throw new Error('ConversationLoopIntegrationService not provided')
      }
      
      return await integrationService.getTranscriptWithCaching(videoId, startTime, endTime, language)
    },
    enabled: Boolean(videoId && startTime !== null && endTime !== null && integrationService),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - transcripts don't change
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: (failureCount, error) => {
      // Don't retry for integration service errors or video availability issues
      if (error && typeof error === 'object') {
        const errorMessage = error.message || String(error)
        if (errorMessage.includes('ConversationLoopIntegrationService not provided') ||
            errorMessage.includes('VIDEO_NOT_FOUND') || 
            errorMessage.includes('NOT_AVAILABLE') || 
            errorMessage.includes('PRIVATE_VIDEO') ||
            errorMessage.includes('Transcript server not configured')) {
          return false
        }
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000), // Cap at 8 seconds
    throwOnError: false // Let components handle errors gracefully
  })
}

export function useTranscriptMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      videoId,
      startTime,
      endTime,
      language
    }: {
      videoId: string
      startTime: number
      endTime: number
      language?: string
    }) => {
      console.log(`useTranscriptMutation: Fetching transcript for ${videoId} (${startTime}s-${endTime}s)`)
      return youtubeTranscriptService.getTranscriptSegment(videoId, startTime, endTime, language)
    },
    onSuccess: (data, variables) => {
      // Update the query cache with the new data
      queryClient.setQueryData(
        queryKeys.transcripts.bySegment(variables.videoId, variables.startTime, variables.endTime),
        data
      )

      // Invalidate related queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.transcripts.all })

      // Optionally save to database with error handling
      supabaseService.saveTranscript(
        variables.videoId,
        variables.startTime,
        variables.endTime,
        data.segments,
        data.fullText,
        data.language
      ).then((transcriptId) => {
        console.log(`useTranscriptMutation: Successfully saved transcript with ID: ${transcriptId}`)
      }).catch(error => {
        console.error('useTranscriptMutation: Failed to save transcript to database:', error)
        // Don't propagate this error since the transcript fetching succeeded
      })
    },
    onError: (error: any, variables) => {
      console.error(`Transcript mutation failed for ${variables.videoId} (${variables.startTime}s-${variables.endTime}s):`, error)
      
      // Could implement additional error reporting here
      // e.g., analytics, user notification, etc.
    },
    retry: 1 // Only retry once for mutations
  })
}

export function useUpdateLoopWithTranscript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      segmentId,
      transcriptId,
      transcriptMetadata
    }: {
      segmentId: string
      transcriptId: string
      transcriptMetadata: any
    }) => {
      return supabaseService.updateLoopWithTranscript(segmentId, transcriptId, transcriptMetadata)
    },
    onSuccess: () => {
      // Invalidate loops cache to refresh UI
      queryClient.invalidateQueries({ queryKey: queryKeys.loops.all })
    },
    onError: (error) => {
      console.error('Failed to update loop with transcript:', error)
    }
  })
}