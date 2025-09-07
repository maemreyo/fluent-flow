'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useSessionSynchronization } from '../../../app/groups/[groupId]/quiz/[sessionId]/hooks/useSessionSynchronization'

interface GlobalSessionListenerProps {
  groupId: string
  activeSessionId?: string
  isInQuizRoom?: boolean // Whether user is currently in a quiz room modal
}

export function GlobalSessionListener({ 
  groupId, 
  activeSessionId,
  isInQuizRoom = false
}: GlobalSessionListenerProps) {
  const { user } = useAuth()

  // Only listen for session changes if there's an active session and user is not in room
  const {
    sessionState
  } = useSessionSynchronization({
    groupId,
    sessionId: activeSessionId || '',
    isInRoom: isInQuizRoom,
    enabled: !!activeSessionId && !isInQuizRoom && !!user
  })

  // Show notification when quiz starts (for users outside room)
  useEffect(() => {
    if (
      !isInQuizRoom && 
      activeSessionId && 
      sessionState?.status === 'starting' && 
      sessionState.quiz_started_by !== user?.id
    ) {
      // Don't show notification if current user started the quiz
      // The notification will be handled by the component
      console.log('Quiz started by another user, showing notification')
    }
  }, [sessionState, activeSessionId, isInQuizRoom, user?.id])

  // This component doesn't render anything visible
  // It only manages global session listening and notifications
  return null
}

// Hook for easy integration in group pages
export function useGlobalSessionListener(groupId: string) {
  const { user } = useAuth()
  const [activeSessions, setActiveSessions] = useState<string[]>([])
  const [notifications, setNotifications] = useState<Array<{
    id: string
    sessionId: string
    type: 'session_started' | 'session_ended'
    timestamp: Date
  }>>([])

  // Track active sessions in the group
  useEffect(() => {
    if (!user || !groupId) return

    const fetchActiveSessions = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/sessions?status=active`)
        if (response.ok) {
          const sessions = await response.json()
          const sessionIds = sessions.map((s: any) => s.id)
          setActiveSessions(sessionIds)
        }
      } catch (error) {
        console.error('Failed to fetch active sessions:', error)
      }
    }

    fetchActiveSessions()
    const interval = setInterval(fetchActiveSessions, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [groupId, user])

  // Clear old notifications
  useEffect(() => {
    const cleanup = setInterval(() => {
      setNotifications(prev => 
        prev.filter(notif => Date.now() - notif.timestamp.getTime() < 300000) // Keep for 5 minutes
      )
    }, 60000) // Clean every minute

    return () => clearInterval(cleanup)
  }, [])

  const addNotification = (sessionId: string, type: 'session_started' | 'session_ended') => {
    setNotifications(prev => [...prev, {
      id: `${sessionId}-${type}-${Date.now()}`,
      sessionId,
      type,
      timestamp: new Date()
    }])
  }

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  return {
    activeSessions,
    notifications,
    addNotification,
    clearNotification
  }
}