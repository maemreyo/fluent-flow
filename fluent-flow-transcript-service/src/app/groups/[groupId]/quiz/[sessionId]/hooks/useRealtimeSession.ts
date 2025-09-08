import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../../../lib/supabase/client'

interface RealtimeSessionData {
  session_status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  participants_count: number
  online_count: number
  current_question?: number
  quiz_progress?: {
    started_at?: string
    current_phase: 'waiting' | 'active' | 'completed'
    participants_ready: number
    total_participants: number
  }
  live_scores?: {
    user_id: string
    current_score: number
    questions_completed: number
  }[]
}

interface UseRealtimeSessionProps {
  groupId: string
  sessionId: string
  enabled?: boolean
}

export function useRealtimeSession({ 
  groupId, 
  sessionId, 
  enabled = true 
}: UseRealtimeSessionProps) {
  const queryClient = useQueryClient()
  const [realtimeData, setRealtimeData] = useState<RealtimeSessionData | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Use inline query keys instead of dynamic import
  const quizQueryKeys = {
    session: (groupId: string, sessionId: string) => ['group-session', groupId, sessionId],
    sessionParticipants: (groupId: string, sessionId: string) => ['session-participants', groupId, sessionId],
    sessionResults: (groupId: string, sessionId: string) => ['group-results', groupId, sessionId]
  }

  useEffect(() => {
    if (!enabled || !supabase) return

    // Create realtime channel for this specific session
    const channel = supabase
      .channel(`group-quiz-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('Syncing presence state')
        setIsConnected(true)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New users joined:', newPresences)
        // Invalidate participants data using centralized query keys
        queryClient.invalidateQueries({
          queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Users left:', leftPresences)
        queryClient.invalidateQueries({
          queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
        })
      })
      // Listen for session status changes
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_quiz_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        console.log('Session updated:', payload.new)
        // Invalidate session data using centralized query keys
        queryClient.invalidateQueries({
          queryKey: quizQueryKeys.session(groupId, sessionId)
        })
        
        // Update realtime data
        setRealtimeData(prev => prev ? ({
          ...prev,
          session_status: (payload.new as any).status,
        }) : null)
      })
      // Listen for new quiz results (live scores)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_quiz_results',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('Quiz results updated:', payload.new)
        // Invalidate results data for live leaderboard using centralized query keys
        queryClient.invalidateQueries({
          queryKey: quizQueryKeys.sessionResults(groupId, sessionId)
        })
      })
      // Listen for participant changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('Participants updated:', payload)
        queryClient.invalidateQueries({
          queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
        })
      })

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Connected to realtime channel: group-quiz-${sessionId}`)
        setIsConnected(true)
        
        // Track current user presence
        await channel.track({
          user_id: 'current-user', // You should pass actual user ID
          online_at: new Date().toISOString(),
          status: 'active'
        })
      }
    })

    // Cleanup subscription
    return () => {
      console.log(`Disconnecting from realtime channel: group-quiz-${sessionId}`)
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, groupId, sessionId, queryClient])

  // Broadcast quiz events
  const broadcastQuizEvent = async (event: {
    type: 'question_answered' | 'quiz_started' | 'quiz_completed' | 'user_ready'
    data?: any
  }) => {
    if (!supabase) return

    const channel = supabase.channel(`group-quiz-${sessionId}`)
    await channel.send({
      type: 'broadcast',
      event: 'quiz_event',
      payload: event
    })
  }

  // Manual refresh for critical updates using centralized query keys
  const refreshSession = () => {
    queryClient.invalidateQueries({
      queryKey: quizQueryKeys.session(groupId, sessionId)
    })
    queryClient.invalidateQueries({
      queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
    })
    queryClient.invalidateQueries({
      queryKey: quizQueryKeys.sessionResults(groupId, sessionId)
    })
  }

  return {
    realtimeData,
    isConnected,
    broadcastQuizEvent,
    refreshSession
  }
}