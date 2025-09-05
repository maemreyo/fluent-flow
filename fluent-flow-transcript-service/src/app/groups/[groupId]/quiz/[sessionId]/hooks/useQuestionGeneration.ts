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

  // Single difficulty question generation mutation with custom count support
  const generateQuestionsMutation = useQuestionGeneration({
    onSuccess: data => {
      console.log(`Successfully generated ${data.count} ${data.difficulty} questions`)

      setGeneratedCounts(prev => ({
        ...prev,
        [data.difficulty]: prev[data.difficulty as keyof GeneratedCounts] + data.count
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

  // Generate all questions mutation with preset support
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

      setGeneratedCounts(prev => ({
        easy: prev.easy + newCounts.easy,
        medium: prev.medium + newCounts.medium,
        hard: prev.hard + newCounts.hard
      }))
      setShareTokens(prev => ({ ...prev, ...newShareTokens }))
      setGeneratingState(prev => ({ ...prev, all: false }))
    },
    onError: () => {
      setGeneratingState(prev => ({ ...prev, all: false }))
    }
  })

  const handleGenerateQuestions = async (
    difficulty: 'easy' | 'medium' | 'hard', 
    loopData: any, 
    customCount?: number
  ) => {
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
    
    // Use custom count if provided, otherwise default generation
    const generationParams = customCount 
      ? { difficulty, loop, groupId, sessionId, customCount }
      : { difficulty, loop, groupId, sessionId }
      
    await generateQuestionsMutation.mutateAsync(generationParams)
  }

  const handleGenerateAllQuestions = async (loopData: any, presetCounts?: GeneratedCounts) => {
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
    
    // Use preset counts if provided
    const generationParams = presetCounts 
      ? { loop, groupId, sessionId, presetCounts }
      : { loop, groupId, sessionId }
      
    await generateAllQuestionsMutation.mutateAsync(generationParams)
  }

  // New method for generating questions based on preset distribution
  const handleGenerateFromPreset = async (
    loopData: any, 
    distribution: { easy: number; medium: number; hard: number }
  ) => {
    if (!loopData) {
      toast.error('No loop data available for question generation')
      return
    }

    const { easy, medium, hard } = distribution
    const promises = []

    try {
      setGeneratingState(prev => ({ ...prev, all: true }))

      // Generate questions for each difficulty based on preset distribution
      // Break down larger counts into smaller batches for quality (5-8 questions per batch)
      const MAX_BATCH_SIZE = 6

      if (easy > 0) {
        const batches = Math.ceil(easy / MAX_BATCH_SIZE)
        for (let i = 0; i < batches; i++) {
          const batchSize = Math.min(MAX_BATCH_SIZE, easy - (i * MAX_BATCH_SIZE))
          promises.push(handleGenerateQuestions('easy', loopData, batchSize))
        }
      }

      if (medium > 0) {
        const batches = Math.ceil(medium / MAX_BATCH_SIZE)
        for (let i = 0; i < batches; i++) {
          const batchSize = Math.min(MAX_BATCH_SIZE, medium - (i * MAX_BATCH_SIZE))
          promises.push(handleGenerateQuestions('medium', loopData, batchSize))
        }
      }

      if (hard > 0) {
        const batches = Math.ceil(hard / MAX_BATCH_SIZE)
        for (let i = 0; i < batches; i++) {
          const batchSize = Math.min(MAX_BATCH_SIZE, hard - (i * MAX_BATCH_SIZE))
          promises.push(handleGenerateQuestions('hard', loopData, batchSize))
        }
      }

      await Promise.all(promises)
      setGeneratingState(prev => ({ ...prev, all: false }))
      
      toast.success(`Successfully generated ${easy + medium + hard} questions from preset!`)
    } catch (error) {
      console.error('Failed to generate questions from preset:', error)
      setGeneratingState(prev => ({ ...prev, all: false }))
      toast.error('Failed to generate questions from preset')
    }
  }

  return {
    generatingState,
    generatedCounts,
    shareTokens,
    setGeneratedCounts,
    setShareTokens,
    handleGenerateQuestions,
    handleGenerateAllQuestions,
    handleGenerateFromPreset
  }
}
