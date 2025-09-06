'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../../../../../contexts/AuthContext'
import { supabase } from '../../../../../../lib/supabase/client'
import { toast } from 'sonner'
import { useQuizBroadcast } from './useQuizBroadcast'
import { useQuizEventHandlers } from './useQuizEventHandlers'

export type QuizStep = 'preset-selection' | 'question-generation' | 'ready-to-start'

interface QuizSyncState {
  currentStep: QuizStep
  questionsReady: boolean
  lastUpdatedBy?: string
}

interface UseQuizSyncProps {
  groupId: string
  sessionId: string
  canManage: boolean
  enabled?: boolean
}

export function useQuizSync({ groupId, sessionId, canManage, enabled = true }: UseQuizSyncProps) {
  const { user } = useAuth()
  const [syncState, setSyncState] = useState<QuizSyncState>({
    currentStep: 'preset-selection',
    questionsReady: false
  })
  const [isConnected, setIsConnected] = useState(false)
  const [channelRef, setChannelRef] = useState<any>(null)

  // Broadcasting functions
  const { broadcastQuizSessionStart, broadcastPreparationUpdate } = useQuizBroadcast({
    groupId,
    sessionId,
    channelRef,
    canBroadcast: canManage,
    userId: user?.id
  })

  // Event handlers
  const { handleQuizSessionStartReceived } = useQuizEventHandlers({
    groupId,
    sessionId,
    canManage,
    onBroadcastPreparationUpdate: broadcastPreparationUpdate,
    onBroadcastQuizStart: broadcastQuizSessionStart
  })

  // Setup real-time connection
  useEffect(() => {
    if (!enabled || !supabase || !user) {
      console.log('⚠️ Quiz sync disabled:', { enabled, supabase: !!supabase, user: !!user })
      return
    }

    console.log('🔌 Setting up quiz sync...', { sessionId, canManage, userId: user.id })

    const channel = supabase
      .channel(`quiz-sync-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('📡 Quiz sync established')
        setIsConnected(true)
      })
      // Listen for preparation updates
      .on('broadcast', { event: 'quiz_preparation_change' }, (payload) => {
        const { type, step, updated_by, ...data } = payload.payload

        if (type === 'preparation_update' && updated_by !== user.id) {
          console.log('🎯 Received preparation update:', { step, updated_by })
          
          setSyncState(prev => ({
            ...prev,
            currentStep: step,
            ...data,
            lastUpdatedBy: updated_by
          }))

          // Show notifications for non-managing users
          if (!canManage) {
            if (step === 'question-generation' && data.selectedPreset) {
              toast.info(`Preset selected: ${data.selectedPreset.name}`)
            } else if (step === 'ready-to-start') {
              toast.success('Questions ready! Quiz starting soon.')
            }
          }
        }
      })
      // Listen for quiz session starts
      .on('broadcast', { event: 'quiz_session_start' }, (payload) => {
        const { type, started_by } = payload.payload

        if (type === 'quiz_session_starting' && started_by !== user.id) {
          handleQuizSessionStartReceived(payload.payload)
        }
      })

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`📡 Connected to quiz sync: ${sessionId}`)
        setIsConnected(true)
        setChannelRef(channel)

        if (user) {
          await channel.track({
            user_id: user.id,
            can_manage: canManage,
            joined_at: new Date().toISOString()
          })
        }
      }
    })

    return () => {
      console.log(`📡 Disconnecting from quiz sync: ${sessionId}`)
      setChannelRef(null)
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, groupId, sessionId, user, canManage, handleQuizSessionStartReceived])

  return {
    syncState,
    isConnected,
    broadcastQuizSessionStart,
    broadcastPreparationUpdate
  }
}