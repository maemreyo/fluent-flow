'use client'

import { useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useSessionSynchronization } from '../../../app/groups/[groupId]/quiz/[sessionId]/hooks/useSessionSynchronization'
import { SessionNotificationToast } from './SessionNotificationToast'

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
  // This could be enhanced to track all active sessions in the group
  // For now, it's a placeholder for the main session listener integration
  
  return {
    // Future: track active sessions, show notifications, etc.
  }
}