'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../../../../../contexts/AuthContext'
import { supabase } from '../../../../../../lib/supabase/client'
import { toast } from 'sonner'

export type QuizPreparationStep = 'preset-selection' | 'question-generation' | 'ready-to-start'

interface QuizPreparationState {
  currentStep: QuizPreparationStep
  selectedPreset?: {
    id: string
    name: string
    distribution: { easy: number; medium: number; hard: number }
  }
  generationProgress?: {
    easy: boolean
    medium: boolean
    hard: boolean
    completed: boolean
  }
  questionsReady: boolean
  lastUpdatedBy?: string
  lastUpdatedAt?: string
}

interface UseQuizPreparationSyncProps {
  groupId: string
  sessionId: string
  enabled?: boolean
  canManage: boolean // Whether user can manage quiz (owner/admin/creator)
}

export function useQuizPreparationSync({
  groupId,
  sessionId,
  enabled = true,
  canManage
}: UseQuizPreparationSyncProps) {
  const { user } = useAuth()
  const [preparationState, setPreparationState] = useState<QuizPreparationState>({
    currentStep: 'preset-selection',
    questionsReady: false
  })
  const [isConnected, setIsConnected] = useState(false)
  const [channelRef, setChannelRef] = useState<any>(null)

  // Broadcast preparation state changes (for owners/admins)
  const broadcastPreparationUpdate = useCallback(async (
    step: QuizPreparationStep,
    data?: Partial<QuizPreparationState>
  ) => {
    if (!canManage || !channelRef || !user) {
      console.log('⚠️ Cannot broadcast - insufficient permissions or missing channel')
      return
    }

    console.log('📡 Broadcasting preparation update:', { step, data, sessionId })

    try {
      const payload = {
        type: 'preparation_update',
        step,
        ...data,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      await channelRef.send({
        type: 'broadcast',
        event: 'quiz_preparation_change',
        payload
      })

      console.log('✅ Preparation update broadcasted successfully')

      // Update local state immediately for broadcaster
      setPreparationState(prev => ({
        ...prev,
        currentStep: step,
        ...data,
        lastUpdatedBy: user.id,
        lastUpdatedAt: new Date().toISOString()
      }))

    } catch (error) {
      console.error('❌ Failed to broadcast preparation update:', error)
    }
  }, [canManage, channelRef, user, sessionId])

  // Specific broadcast functions for different events
  const broadcastPresetSelected = useCallback((preset: QuizPreparationState['selectedPreset']) => {
    broadcastPreparationUpdate('question-generation', {
      selectedPreset: preset,
      generationProgress: { easy: false, medium: false, hard: false, completed: false }
    })
  }, [broadcastPreparationUpdate])

  const broadcastQuestionGeneration = useCallback((progress: QuizPreparationState['generationProgress']) => {
    broadcastPreparationUpdate('question-generation', {
      generationProgress: progress
    })
  }, [broadcastPreparationUpdate])

  const broadcastQuestionsReady = useCallback(() => {
    broadcastPreparationUpdate('ready-to-start', {
      questionsReady: true,
      generationProgress: { easy: true, medium: true, hard: true, completed: true }
    })
  }, [broadcastPreparationUpdate])

  const broadcastQuizSessionStart = useCallback(async () => {
    if (!canManage || !channelRef || !user) {
      console.log('⚠️ Cannot broadcast quiz session start - insufficient permissions')
      return
    }

    console.log('🚀 Broadcasting quiz session start...', { sessionId, userId: user.id })

    try {
      const payload = {
        type: 'quiz_session_starting',
        started_by: user.id,
        started_at: new Date().toISOString(),
        countdown: 5,
        sessionId,
        quiz_title: 'Quiz Session' // Could be enhanced with actual title
      }

      // Broadcast to session-specific channel for participants in the session
      await channelRef.send({
        type: 'broadcast',
        event: 'quiz_session_start',
        payload
      })

      // Also broadcast to global group channel for users not in session
      const globalChannel = supabase?.channel(`group-wide-notifications-${groupId}`)
      if (globalChannel) {
        await globalChannel.send({
          type: 'broadcast',
          event: 'global_quiz_session_start', 
          payload
        })
        console.log('📡 Global notification also sent to group channel')
      }

      console.log('✅ Quiz session start broadcasted successfully to both channels')
      return true
    } catch (error) {
      console.error('❌ Failed to broadcast quiz session start:', error)
      return false
    }
  }, [canManage, channelRef, user, sessionId, groupId])

  // Setup real-time listeners
  useEffect(() => {
    if (!enabled || !supabase || !user) {
      console.log('⚠️ Quiz preparation sync disabled:', { enabled, supabase: !!supabase, user: !!user })
      return
    }

    console.log('🔌 Setting up quiz preparation synchronization...', { sessionId, canManage, userId: user.id })

    const channel = supabase
      .channel(`quiz-preparation-sync-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        console.log('📡 Preparation sync established')
        setIsConnected(true)
      })
      // Listen for preparation state broadcasts
      .on('broadcast', { event: 'quiz_preparation_change' }, (payload) => {
        const { type, step, updated_by, updated_at, ...data } = payload.payload

        console.log('🎯 Received preparation state change:', {
          type,
          step,
          updated_by,
          canManage,
          currentUserId: user.id
        })

        if (type === 'preparation_update') {
          // Don't update state for the user who sent the broadcast (they already have it)
          if (updated_by === user.id) {
            console.log('👤 Ignoring own broadcast')
            return
          }

          // Update preparation state for other participants
          setPreparationState(prev => ({
            ...prev,
            currentStep: step,
            ...data,
            lastUpdatedBy: updated_by,
            lastUpdatedAt: updated_at
          }))

          // Show notifications for non-managing users
          if (!canManage) {
            if (step === 'question-generation' && data.selectedPreset) {
              toast.info(`Quiz preset selected: ${data.selectedPreset.name}`)
            } else if (step === 'ready-to-start') {
              toast.success('Questions are ready! Quiz will start soon.')
            }
          }
        }
      })
      // Listen for quiz session start broadcasts
      .on('broadcast', { event: 'quiz_session_start' }, (payload) => {
        const { type, started_by, started_at, countdown } = payload.payload

        console.log('🎯 Received quiz session start:', {
          type,
          started_by,
          countdown,
          canManage,
          currentUserId: user.id
        })

        if (type === 'quiz_session_starting') {
          // Don't process own broadcast for managers
          if (canManage && started_by === user.id) {
            console.log('👤 Owner ignoring own quiz session start broadcast')
            return
          }

          // Show countdown and redirect for all participants
          console.log('🚀 Quiz session starting - showing countdown')
          toast.success(`Quiz starting in ${countdown} seconds!`, {
            duration: countdown * 1000
          })

          // Auto-redirect after countdown (for members)
          setTimeout(() => {
            console.log('🎯 Auto-redirecting to quiz after countdown')
            window.location.href = `/groups/${window.location.pathname.split('/')[2]}/quiz/${window.location.pathname.split('/')[4]}`
          }, countdown * 1000)
        }
      })

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Connected to preparation sync channel: ${sessionId}`)
        setIsConnected(true)
        setChannelRef(channel)

        // Track presence
        if (user) {
          await channel.track({
            user_id: user.id,
            user_email: user.email,
            can_manage: canManage,
            joined_at: new Date().toISOString()
          })
        }
      }
    })

    return () => {
      console.log(`Disconnecting from preparation sync channel: ${sessionId}`)
      setChannelRef(null)
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, groupId, sessionId, user, canManage])

  return {
    preparationState,
    isConnected,
    // Broadcast functions for owners/admins
    broadcastPresetSelected,
    broadcastQuestionGeneration, 
    broadcastQuestionsReady,
    broadcastQuizSessionStart,
    // Raw broadcast function for custom updates
    broadcastPreparationUpdate
  }
}