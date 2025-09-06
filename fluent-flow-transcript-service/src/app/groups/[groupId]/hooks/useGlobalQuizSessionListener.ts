'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { supabase } from '../../../../lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ActiveSession {
  sessionId: string
  quiz_title: string
  status: 'scheduled' | 'active' | 'completed'
  created_by: string
}

interface UseGlobalQuizSessionListenerProps {
  groupId: string
  enabled?: boolean
}

export function useGlobalQuizSessionListener({
  groupId,
  enabled = true
}: UseGlobalQuizSessionListenerProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !supabase || !user || !groupId) {
      console.log('⚠️ Global quiz session listener disabled:', { 
        enabled, 
        supabase: !!supabase, 
        user: !!user,
        groupId 
      })
      return
    }

    console.log('🌍 Setting up global quiz session listener...', { groupId, userId: user.id })

    // Listen to the group-wide broadcast channel
    // This will catch broadcasts from all sessions in the group
    const channel = supabase
      .channel(`group-wide-notifications-${groupId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('📡 Global group notifications sync established')
        setIsConnected(true)
      })
      // Listen for quiz session starts from any session in the group
      .on('broadcast', { event: 'global_quiz_session_start' }, (payload) => {
        const { sessionId, started_by, quiz_title, type } = payload.payload || payload
        
        console.log('🎯 Global: Quiz session starting detected', {
          sessionId,
          started_by,
          quiz_title,
          currentUserId: user.id,
          type
        })

        // Don't show notification if current user started it
        if (started_by === user.id) {
          console.log('👤 Ignoring own quiz session start')
          return
        }

        // Show notification with option to join
        toast.info(`Quiz "${quiz_title || 'Session'}" is starting!`, {
          description: 'Click to join the quiz session',
          action: {
            label: 'Join Quiz',
            onClick: () => {
              console.log('🚀 Navigating to quiz session from global notification')
              router.push(`/groups/${groupId}/quiz/${sessionId}`)
            }
          },
          duration: 10000 // 10 second duration
        })
      })
      // Listen for session room activity (from the existing system)  
      .on('broadcast', { event: 'session_state_change' }, (payload) => {
        const { type, started_by, sessionId } = payload.payload || payload
        
        if (type === 'quiz_starting' && started_by !== user.id) {
          console.log('🎯 Global: Quiz room start detected', { sessionId, started_by })
          
          // Show notification for quiz room starts too
          toast.info('A quiz session is starting!', {
            description: 'Click to join the session',
            action: {
              label: 'Join',
              onClick: () => router.push(`/groups/${groupId}/quiz/${sessionId}`)
            },
            duration: 8000
          })
        }
      })

    // Subscribe to the global channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`🌍 Connected to global group activity channel: ${groupId}`)
        setIsConnected(true)

        // Track global presence
        await channel.track({
          user_id: user.id,
          user_email: user.email,
          page: 'group_overview',
          joined_at: new Date().toISOString()
        })
      }
    })

    return () => {
      console.log(`🌍 Disconnecting from global group activity channel: ${groupId}`)
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, groupId, user, router])

  // Also listen to multiple session channels simultaneously for active sessions
  useEffect(() => {
    if (!enabled || !supabase || !user || activeSessions.length === 0) return

    console.log('👂 Setting up listeners for active sessions:', activeSessions.length)

    const channels = activeSessions.map(session => {
      const sessionChannel = supabase!
        .channel(`global-session-${session.sessionId}`)
        .on('broadcast', { event: 'quiz_session_start' }, (payload) => {
          const { started_by, quiz_title } = payload.payload || payload
          
          if (started_by !== user.id) {
            toast.success(`"${quiz_title || session.quiz_title}" is starting!`, {
              action: {
                label: 'Join Now',
                onClick: () => router.push(`/groups/${groupId}/quiz/${session.sessionId}`)
              },
              duration: 10000
            })
          }
        })

      sessionChannel.subscribe()
      return sessionChannel
    })

    return () => {
      channels.forEach(ch => ch.unsubscribe())
    }
  }, [enabled, supabase, user, activeSessions, groupId, router])

  return {
    isConnected,
    activeSessions,
    setActiveSessions // Allow parent to set active sessions
  }
}