'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../../../lib/supabase/client'
import { useAuth } from '../../../../../../contexts/AuthContext'
import { toast } from 'sonner'

interface SessionState {
  status: 'waiting' | 'starting' | 'active' | 'completed'
  quiz_started_at?: string
  quiz_started_by?: string
  participants_in_room: string[]
  participants_in_quiz: string[]
  auto_start_countdown?: number
}

interface UseSessionSynchronizationProps {
  groupId: string
  sessionId: string
  isInRoom: boolean // Whether user is currently in the quiz room modal
  enabled?: boolean
  onJoinQuiz?: () => void // Callback when user joins quiz (for modal state management)
}

export function useSessionSynchronization({
  groupId,
  sessionId,
  isInRoom,
  enabled = true,
  onJoinQuiz
}: UseSessionSynchronizationProps) {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'waiting',
    participants_in_room: [],
    participants_in_quiz: []
  })
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [channelRef, setChannelRef] = useState<any>(null)
  const [isStartingQuiz, setIsStartingQuiz] = useState(false)

  // Broadcast session state change (for owners/admins)
  const broadcastSessionStart = useCallback(async () => {
    if (!supabase || !user || !channelRef) {
      console.error('❌ Cannot broadcast - missing dependencies:', { 
        supabase: !!supabase, 
        user: !!user, 
        channelRef: !!channelRef 
      })
      return
    }

    // Prevent multiple start attempts
    if (isStartingQuiz) {
      console.log('⚠️ Quiz start already in progress, ignoring duplicate request')
      toast.warning('Quiz is already starting...')
      return
    }

    console.log('🚀 Starting quiz broadcast...', { sessionId, userId: user.id })
    setIsStartingQuiz(true)
    
    try {
      const payload = {
        type: 'quiz_starting',
        started_by: user.id,
        started_at: new Date().toISOString(),
        countdown: 5 // 5 second countdown before auto-start
      }
      
      console.log('📡 Broadcasting payload:', payload)
      
      await channelRef.send({
        type: 'broadcast',
        event: 'session_state_change',
        payload
      })

      console.log('✅ Quiz start broadcasted successfully to all participants')

      // Trigger countdown locally for the broadcaster (since Supabase doesn't echo own broadcasts)
      if (isInRoom) {
        console.log('🎯 Triggering local countdown for broadcaster')
        setSessionState(prev => ({
          ...prev,
          status: 'starting',
          quiz_started_by: user.id,
          quiz_started_at: new Date().toISOString()
        }))
        setAutoStartCountdown(5)
        toast.success('Quiz starting in 5 seconds...', {
          duration: 5000
        })
        console.log('⏰ Local countdown triggered for broadcaster')
      }
    } catch (error) {
      console.error('❌ Failed to broadcast quiz start:', error)
      toast.error('Failed to start quiz. Please try again.')
    } finally {
      // Reset starting state after a delay to allow for successful completion
      setTimeout(() => {
        setIsStartingQuiz(false)
      }, 6000) // Reset after 6 seconds (5s countdown + 1s buffer)
    }
  }, [sessionId, user, channelRef, isInRoom, isStartingQuiz])

  // Handle quiz auto-start for room participants
  const handleAutoStart = useCallback(() => {
    if (isInRoom && autoStartCountdown !== null && autoStartCountdown <= 0) {
      console.log('🚀 Auto-starting quiz for room participant')
      toast.success('Quiz starting now!')
      
      // Call the modal state management callback first
      if (onJoinQuiz) {
        onJoinQuiz()
      }
      
      router.push(`/groups/${groupId}/quiz/${sessionId}`)
    }
  }, [isInRoom, autoStartCountdown, router, groupId, sessionId, onJoinQuiz])

  // Cancel countdown function
  const cancelCountdown = useCallback(async () => {
    if (!supabase || !user || !channelRef) {
      console.error('❌ Cannot broadcast cancel - missing dependencies')
      return
    }

    console.log('🛑 Broadcasting quiz countdown cancellation...')
    
    try {
      const payload = {
        type: 'quiz_cancelled',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString()
      }
      
      console.log('📡 Broadcasting cancel payload:', payload)
      
      await channelRef.send({
        type: 'broadcast',
        event: 'session_state_change',
        payload
      })

      console.log('✅ Quiz cancellation broadcasted to all participants')
      
      // Apply local cancellation for broadcaster
      setAutoStartCountdown(null)
      setIsStartingQuiz(false)
      setSessionState(prev => ({
        ...prev,
        status: 'waiting'
      }))
      toast.info('Quiz start cancelled')
      
    } catch (error) {
      console.error('❌ Failed to broadcast cancellation:', error)
      toast.error('Failed to cancel quiz. Please try again.')
    }
  }, [user, channelRef])

  // Setup real-time listeners
  useEffect(() => {
    if (!enabled || !supabase || !user) {
      console.log('⚠️  Session sync disabled:', { enabled, supabase: !!supabase, user: !!user })
      return
    }

    console.log('🔌 Setting up session synchronization...', { sessionId, isInRoom, userId: user.id })

    const channel = supabase
      .channel(`group-quiz-sync-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('📡 Presence sync established')
        setIsConnected(true)
      })
      // Listen for session state broadcasts
      .on('broadcast', { event: 'session_state_change' }, (payload) => {
        const { type, started_by, started_at, countdown, cancelled_by, cancelled_at } = payload.payload

        console.log('🎯 Received session state change:', {
          type,
          started_by,
          started_at,
          countdown,
          cancelled_by,
          cancelled_at,
          isInRoom,
          currentUserId: user.id
        })

        if (type === 'quiz_starting') {
          setSessionState(prev => ({
            ...prev,
            status: 'starting',
            quiz_started_by: started_by,
            quiz_started_at: started_at
          }))

          // Handle different scenarios based on user location
          if (isInRoom) {
            console.log('👤 User in room - starting countdown:', countdown)
            // User is in room - start countdown for auto-redirect
            if (countdown && countdown > 0) {
              setAutoStartCountdown(countdown)
              toast.success(`Quiz starting in ${countdown} seconds...`, {
                duration: countdown * 1000
              })
              console.log('⏰ Auto-start countdown set:', countdown)
            } else {
              console.log('🚀 Immediate redirect - no countdown')
              // Immediate redirect
              router.push(`/groups/${groupId}/quiz/${sessionId}`)
            }
          } else {
            console.log('📱 User outside room - showing notification')
            // User is outside room - show notification
            toast.info('Quiz session has started!', {
              action: {
                label: 'Join Quiz',
                onClick: () => router.push(`/groups/${groupId}/quiz/${sessionId}`)
              },
              duration: 10000
            })
          }
        } else if (type === 'quiz_cancelled') {
          console.log('🛑 Quiz cancelled by:', cancelled_by)
          
          // Cancel countdown for all participants
          setAutoStartCountdown(null)
          setIsStartingQuiz(false)
          setSessionState(prev => ({
            ...prev,
            status: 'waiting'
          }))
          
          toast.info('Quiz start has been cancelled by organizer')
        }
      })
      // Listen for database session updates
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_quiz_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        const newSession = payload.new as any
        console.log('Session database updated:', newSession)

        setSessionState(prev => ({
          ...prev,
          status: newSession.status === 'active' ? 'active' : prev.status
        }))

        // Invalidate session queries
        queryClient.invalidateQueries({
          queryKey: ['group-session', groupId, sessionId]
        })
      })
      // Track user presence in room
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Users joined room:', newPresences)
        setSessionState(prev => ({
          ...prev,
          participants_in_room: [
            ...prev.participants_in_room,
            ...newPresences.map((p: any) => p.user_id)
          ]
        }))
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Users left room:', leftPresences)
        setSessionState(prev => ({
          ...prev,
          participants_in_room: prev.participants_in_room.filter(
            id => !leftPresences.some((p: any) => p.user_id === id)
          )
        }))
      })

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Connected to session sync channel: ${sessionId}`)
        setIsConnected(true)
        setChannelRef(channel) // Store channel reference for broadcasting

        // Track user presence if in room
        if (isInRoom && user) {
          await channel.track({
            user_id: user.id,
            user_email: user.email,
            in_room: true,
            joined_at: new Date().toISOString()
          })
        }
      }
    })

    return () => {
      console.log(`Disconnecting from session sync channel: ${sessionId}`)
      setChannelRef(null) // Clear channel reference
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, groupId, sessionId, user, isInRoom, queryClient, router])

  // Auto-start countdown timer
  useEffect(() => {
    if (autoStartCountdown === null || autoStartCountdown <= 0) return

    const timer = setInterval(() => {
      setAutoStartCountdown(prev => {
        if (prev === null || prev <= 0) return null
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoStartCountdown])

  // Handle auto-start when countdown reaches 0
  useEffect(() => {
    handleAutoStart()
  }, [handleAutoStart])

  return {
    sessionState,
    autoStartCountdown,
    isConnected,
    broadcastSessionStart,
    cancelCountdown,
    isStartingQuiz
  }
}