import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LoopWithStats } from '@/lib/services/loop-management-service'
import { getAuthHeaders } from '@/lib/supabase/auth-utils'

interface CreateLoopData {
  videoUrl: string
  startTime: number
  endTime: number
}

export function useLoops(groupId: string) {
  return useQuery({
    queryKey: ['loops', groupId],
    queryFn: async (): Promise<LoopWithStats[]> => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/loops`, {
        headers
      })
      if (!response.ok) {
        throw new Error('Failed to fetch loops')
      }
      const data = await response.json()
      return data.loops
    },
    // Override global settings for fresh data when users export from YouTube
    staleTime: 10 * 1000, // 10 seconds - very short to ensure fresh data
    gcTime: 2 * 60 * 1000, // 2 minutes - short garbage collection
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
    refetchOnReconnect: true // Refetch when network reconnects
  })
}

export function useCreateLoop(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateLoopData) => {
      // First, extract transcript using the existing API
      const transcriptResponse = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: data.videoUrl,
          startTime: data.startTime,
          endTime: data.endTime,
          action: 'getSegment'
        })
      })

      if (!transcriptResponse.ok) {
        const error = await transcriptResponse.json()
        throw new Error(error.error || 'Failed to extract transcript')
      }

      const transcript = await transcriptResponse.json()

      // Then create loop using the API endpoint with auth headers
      const headers = await getAuthHeaders()
      const loopResponse = await fetch(`/api/groups/${groupId}/loops`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          videoUrl: data.videoUrl,
          videoTitle: transcript.videoInfo?.title || 'YouTube Video',
          videoId: transcript.videoId,
          startTime: data.startTime,
          endTime: data.endTime,
          transcript: transcript.fullText,
          segments: transcript.segments,
          language: transcript.language,
          metadata: {
            videoInfo: transcript.videoInfo
          }
        })
      })

      if (!loopResponse.ok) {
        const error = await loopResponse.json()
        throw new Error(error.error || 'Failed to create loop')
      }

      return loopResponse.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loops', groupId] })
    }
  })
}

export function useLoop(groupId: string, loopId: string) {
  return useQuery({
    queryKey: ['loop', groupId, loopId],
    queryFn: async (): Promise<LoopWithStats> => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/loops/${loopId}`, {
        headers
      })
      if (!response.ok) {
        throw new Error('Failed to fetch loop')
      }
      const data = await response.json()
      return data.loop
    },
    enabled: !!loopId && !!groupId,
    // Override global settings for fresh data when users export from YouTube
    staleTime: 10 * 1000, // 10 seconds - very short to ensure fresh data
    gcTime: 2 * 60 * 1000, // 2 minutes - short garbage collection
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
    refetchOnReconnect: true // Refetch when network reconnects
  })
}

export function useSessionQuestions(groupId: string, sessionId: string) {
  return useQuery({
    queryKey: ['sessionQuestions', groupId, sessionId],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/questions`, {
        headers
      })
      if (!response.ok) {
        throw new Error('Failed to fetch session questions')
      }
      const data = await response.json()
      return data.data
    },
    enabled: !!groupId && !!sessionId
  })
}

export function useDeleteLoop(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (loopId: string) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/loops/${loopId}`, {
        method: 'DELETE',
        headers
      })
      if (!response.ok) {
        throw new Error('Failed to delete loop')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loops', groupId] })
    }
  })
}