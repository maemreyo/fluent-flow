'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  useGenerateAllQuestions,
  useQuestionGeneration
} from '../../../../../../hooks/useQuestionGeneration'

interface GeneratingState {
  easy: boolean
  medium: boolean
  hard: boolean
  all: boolean
}

interface GeneratedCounts {
  easy: number
  medium: number
  hard: number
}

export function useGroupQuestionGeneration(groupId: string, sessionId: string) {
  const [generatingState, setGeneratingState] = useState<GeneratingState>({
    easy: false,
    medium: false,
    hard: false,
    all: false
  })

  const [generatedCounts, setGeneratedCounts] = useState<GeneratedCounts>({
    easy: 0,
    medium: 0,
    hard: 0
  })

  const [shareTokens, setShareTokens] = useState<Record<string, string>>({})

  // Single difficulty question generation mutation
  const generateQuestionsMutation = useQuestionGeneration({
    onSuccess: data => {
      console.log(`Successfully generated ${data.count} ${data.difficulty} questions`)

      setGeneratedCounts(prev => ({
        ...prev,
        [data.difficulty]: data.count
      }))

      if (data.shareToken) {
        setShareTokens(
          prev =>
            ({
              ...prev,
              [data.difficulty]: data.shareToken
            }) as any
        )
      }

      setGeneratingState(prev => ({ ...prev, [data.difficulty]: false }))
    },
    onError: (error, difficulty) => {
      setGeneratingState(prev => ({ ...prev, [difficulty]: false }))
    }
  })

  // Generate all questions mutation
  const generateAllQuestionsMutation = useGenerateAllQuestions({
    onSuccess: results => {
      console.log('Successfully generated all questions:', results)

      const newCounts = { easy: 0, medium: 0, hard: 0 }
      const newShareTokens: Record<string, string> = {}

      results.forEach((result: any) => {
        newCounts[result.difficulty as keyof typeof newCounts] = result.count
        if (result.shareToken) {
          newShareTokens[result.difficulty] = result.shareToken
        }
      })

      setGeneratedCounts(newCounts)
      setShareTokens(prev => ({ ...prev, ...newShareTokens }))
      setGeneratingState(prev => ({ ...prev, all: false }))
    },
    onError: () => {
      setGeneratingState(prev => ({ ...prev, all: false }))
    }
  })

  const handleGenerateQuestions = async (difficulty: 'easy' | 'medium' | 'hard', loopData: any) => {
    if (!loopData) {
      toast.error('No loop data available for question generation')
      return
    }

    const loop = {
      id: loopData.id,
      videoTitle: loopData.videoTitle || 'Practice Session',
      startTime: loopData.startTime || 0,
      endTime: loopData.endTime || 300,
      transcript: loopData.transcript || '',
      segments: loopData.segments || []
    }

    setGeneratingState(prev => ({ ...prev, [difficulty]: true }))
    await generateQuestionsMutation.mutateAsync({ difficulty, loop, groupId, sessionId })
  }

  const handleGenerateAllQuestions = async (loopData: any) => {
    if (!loopData) {
      toast.error('No loop data available for question generation')
      return
    }

    const loop = {
      id: loopData.id,
      videoTitle: loopData.videoTitle || 'Practice Session',
      startTime: loopData.startTime || 0,
      endTime: loopData.endTime || 300,
      transcript: loopData.transcript || '',
      segments: loopData.segments || []
    }

    setGeneratingState(prev => ({ ...prev, all: true }))
    await generateAllQuestionsMutation.mutateAsync({ loop, groupId, sessionId })
  }

  return {
    generatingState,
    generatedCounts,
    shareTokens,
    setGeneratedCounts,
    setShareTokens,
    handleGenerateQuestions,
    handleGenerateAllQuestions
  }
}
