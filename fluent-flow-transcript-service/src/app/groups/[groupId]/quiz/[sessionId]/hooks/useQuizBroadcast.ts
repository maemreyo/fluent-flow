'use client'

import { useCallback } from 'react'
import { supabase } from '../../../../../../lib/supabase/client'

interface UseQuizBroadcastProps {
  groupId: string
  sessionId: string
  channelRef: any
  canBroadcast: boolean
  userId?: string
}

export function useQuizBroadcast({ 
  groupId, 
  sessionId, 
  channelRef, 
  canBroadcast, 
  userId 
}: UseQuizBroadcastProps) {
  
  const broadcastQuizSessionStart = useCallback(async (quizTitle?: string, shareTokens?: Record<string, string>) => {
    if (!canBroadcast || !userId) {
      console.log('⚠️ Cannot broadcast quiz session start - missing permissions or user')
      return false
    }

    // Wait for channel to be ready (with retry mechanism)
    let retries = 0
    const maxRetries = 5
    const retryDelay = 500

    while (!channelRef && retries < maxRetries) {
      console.log(`⏳ Waiting for channel connection... (attempt ${retries + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      retries++
    }

    if (!channelRef) {
      console.log('⚠️ Cannot broadcast - channel not ready after retries')
      return false
    }

    console.log('🚀 Broadcasting quiz session start...', { sessionId, userId })

    try {
      const payload = {
        type: 'quiz_session_starting',
        started_by: userId,
        started_at: new Date().toISOString(),
        countdown: 5,
        sessionId,
        quiz_title: quizTitle || 'Quiz Session',
        shareTokens: shareTokens || {} // Include shareTokens for members
      }

      // Broadcast to session participants
      await channelRef.send({
        type: 'broadcast',
        event: 'quiz_session_start',
        payload
      })

      // Broadcast to global group channel
      const globalChannel = supabase?.channel(`group-wide-notifications-${groupId}`)
      if (globalChannel) {
        await globalChannel.send({
          type: 'broadcast',
          event: 'global_quiz_session_start',
          payload
        })
      }

      console.log('✅ Quiz session start broadcasted successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to broadcast quiz session start:', error)
      return false
    }
  }, [canBroadcast, channelRef, userId, sessionId, groupId])

  const broadcastPreparationUpdate = useCallback(async (step: string, data: any) => {
    console.log('📡 Attempting to broadcast preparation update:', { step, data, canBroadcast, hasChannel: !!channelRef, userId })
    
    if (!canBroadcast || !channelRef || !userId) {
      console.log('⚠️ Cannot broadcast preparation update:', { canBroadcast, hasChannel: !!channelRef, userId })
      return
    }

    try {
      const payload = {
        type: 'preparation_update',
        step,
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }
      
      console.log('📡 Broadcasting payload:', payload)

      await channelRef.send({
        type: 'broadcast',
        event: 'quiz_preparation_change',
        payload
      })

      console.log('✅ Preparation update broadcasted successfully:', step)
    } catch (error) {
      console.error('❌ Failed to broadcast preparation update:', error)
    }
  }, [canBroadcast, channelRef, userId])

  const broadcastSessionCancellation = useCallback(async () => {
    if (!canBroadcast || !channelRef || !userId) {
      console.log('⚠️ Cannot broadcast session cancellation')
      return false
    }

    console.log('🛑 Broadcasting session cancellation...', { sessionId, userId })

    try {
      const payload = {
        type: 'session_cancelled',
        cancelled_by: userId,
        cancelled_at: new Date().toISOString(),
        sessionId
      }

      // Broadcast to session participants
      await channelRef.send({
        type: 'broadcast',
        event: 'quiz_session_cancelled',
        payload
      })

      console.log('✅ Session cancellation broadcasted successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to broadcast session cancellation:', error)
      return false
    }
  }, [canBroadcast, channelRef, userId, sessionId])

  return {
    broadcastQuizSessionStart,
    broadcastPreparationUpdate,
    broadcastSessionCancellation
  }
}