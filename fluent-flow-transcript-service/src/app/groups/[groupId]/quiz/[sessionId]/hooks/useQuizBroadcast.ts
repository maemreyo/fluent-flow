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
  
  const broadcastQuizSessionStart = useCallback(async (quizTitle?: string) => {
    if (!canBroadcast || !channelRef || !userId) {
      console.log('⚠️ Cannot broadcast quiz session start')
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
        quiz_title: quizTitle || 'Quiz Session'
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
    if (!canBroadcast || !channelRef || !userId) return

    try {
      const payload = {
        type: 'preparation_update',
        step,
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }

      await channelRef.send({
        type: 'broadcast',
        event: 'quiz_preparation_change',
        payload
      })

      console.log('✅ Preparation update broadcasted:', step)
    } catch (error) {
      console.error('❌ Failed to broadcast preparation update:', error)
    }
  }, [canBroadcast, channelRef, userId])

  return {
    broadcastQuizSessionStart,
    broadcastPreparationUpdate
  }
}