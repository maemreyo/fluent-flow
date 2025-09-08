'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UseQuizEventHandlersProps {
  groupId: string
  sessionId: string
  canManage: boolean
  onBroadcastPreparationUpdate: (step: string, data: any) => void
  onBroadcastQuizStart: (title?: string) => Promise<boolean>
  onMemberStartQuizInfo?: () => void // Add callback for member state transition
}

export function useQuizEventHandlers({
  groupId,
  sessionId,
  canManage,
  onBroadcastPreparationUpdate,
  onBroadcastQuizStart,
  onMemberStartQuizInfo
}: UseQuizEventHandlersProps) {
  const router = useRouter()

  const handlePresetSelected = useCallback((preset: any) => {
    if (canManage) {
      onBroadcastPreparationUpdate('question-generation', {
        selectedPreset: preset,
        generationProgress: { easy: false, medium: false, hard: false, completed: false }
      })
    }
  }, [canManage, onBroadcastPreparationUpdate])

  const handleQuestionsReady = useCallback(() => {
    if (canManage) {
      onBroadcastPreparationUpdate('ready-to-start', {
        questionsReady: true,
        generationProgress: { easy: true, medium: true, hard: true, completed: true }
      })
    }
  }, [canManage, onBroadcastPreparationUpdate])

  const handleQuizSessionStart = useCallback(async (quizTitle?: string) => {
    console.log('🚀 Enhanced quiz session start initiated')

    if (canManage) {
      const success = await onBroadcastQuizStart(quizTitle)
      if (success) {
        console.log('✅ Quiz session start broadcasted to all participants')
        
        // Small delay then redirect owner
        setTimeout(() => {
          console.log('🎯 Owner redirecting to quiz')
          router.push(`/groups/${groupId}/quiz/${sessionId}`)
        }, 1000)
      }
      return success
    }
    return false
  }, [canManage, onBroadcastQuizStart, router, groupId, sessionId])

  const handleQuizSessionStartReceived = useCallback((payload: any) => {
    const { started_by, countdown } = payload
    
    console.log('🎯 Received quiz session start:', { started_by, countdown })
    
    // For members: transition to question-info state instead of redirecting
    if (!canManage && onMemberStartQuizInfo) {
      toast.success(`Quiz starting! Transitioning to info screen...`, {
        duration: 3000
      })
      
      // Immediately transition member to question-info state  
      setTimeout(() => {
        console.log('🎯 Member transitioning to question-info state')
        onMemberStartQuizInfo()
      }, 1000) // 1 second delay for smooth transition
      
    } else if (canManage) {
      // For owners/admins: show countdown and redirect (existing behavior)
      toast.success(`Quiz starting in ${countdown} seconds!`, {
        duration: countdown * 1000
      })

      setTimeout(() => {
        console.log('🎯 Owner auto-redirecting to quiz after countdown')
        router.push(`/groups/${groupId}/quiz/${sessionId}`)
      }, countdown * 1000)
    }
  }, [router, groupId, sessionId, canManage, onMemberStartQuizInfo])

  return {
    handlePresetSelected,
    handleQuestionsReady,
    handleQuizSessionStart,
    handleQuizSessionStartReceived
  }
}