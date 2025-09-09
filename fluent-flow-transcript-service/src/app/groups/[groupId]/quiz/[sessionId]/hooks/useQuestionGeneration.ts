'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  useGenerateAllQuestions,
  useQuestionGeneration
} from '../../../../../../hooks/useQuestionGeneration'
import { getAuthHeaders } from '../../../../../../lib/supabase/auth-utils'
import { useSharedQuestions } from './useSharedQuestions'

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
  // Use shared questions hook for cross-page caching instead of local state
  const { 
    shareTokens: cachedShareTokens, 
    generatedCounts: cachedCounts,
    isLoading: questionsLoading,
    hasQuestions
  } = useSharedQuestions({ groupId, sessionId })

  const [generatingState, setGeneratingState] = useState<GeneratingState>({
    easy: false,
    medium: false,
    hard: false,
    all: false
  })

  // Use cached data from shared hook instead of local state
  const [shareTokens, setShareTokens] = useState<Record<string, string>>({})
  const [generatedCounts, setGeneratedCounts] = useState<GeneratedCounts>({
    easy: 0,
    medium: 0,
    hard: 0
  })

  // New: Track current preset state
  const [currentPreset, setCurrentPreset] = useState<{
    id: string
    name: string
    distribution: GeneratedCounts
    createdAt: Date
  } | null>(null)

  // Sync cached data with local state when available
  useEffect(() => {
    if (hasQuestions) {
      console.log('🔄 [useGroupQuestionGeneration] Syncing from cache:', {
        cachedShareTokens,
        cachedCounts
      })
      setShareTokens(cachedShareTokens)
      setGeneratedCounts(cachedCounts)
    }
  }, [cachedShareTokens, cachedCounts, hasQuestions])

  // Load current preset from database on mount (preset is separate from questions)
  useEffect(() => {
    const loadExistingPreset = async () => {
      try {
        const headers = await getAuthHeaders()
        
        // Load preset (this doesn't change as frequently as questions)
        const presetResponse = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/preset`, {
          headers,
          credentials: 'include'
        })
        if (presetResponse.ok) {
          const presetData = await presetResponse.json()
          if (presetData.currentPreset) {
            setCurrentPreset({
              ...presetData.currentPreset,
              createdAt: new Date(presetData.currentPreset.createdAt)
            })
            console.log('📦 Loaded current preset from database:', presetData.currentPreset.name)
          }
        }
      } catch (error) {
        console.warn('Failed to load existing preset:', error)
      }
    }

    loadExistingPreset()
  }, [groupId, sessionId])

  // Function to save current preset to database
  const saveCurrentPreset = async (preset: {
    id: string
    name: string
    distribution: GeneratedCounts
    createdAt: Date
  } | null) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/preset`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ preset }),
      })
      
      if (response.ok) {
        console.log('Saved current preset to database')
      } else {
        console.warn('Failed to save preset to database')
      }
    } catch (error) {
      console.warn('Error saving preset to database:', error)
    }
  }

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

  // New: Clear existing questions and reset state
  const clearExistingQuestions = async () => {
    console.log('Clearing existing questions and preset state')
    
    // Clear local state immediately for responsive UI
    setGeneratedCounts({ easy: 0, medium: 0, hard: 0 })
    setShareTokens({})
    setCurrentPreset(null)
    
    // Clear database questions and preset state in the background
    const promises = []
    
    // Clear questions from database
    promises.push(
      (async () => {
        const headers = await getAuthHeaders()
        return fetch(`/api/groups/${groupId}/sessions/${sessionId}/questions`, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        })
      })().then(response => {
        if (response.ok) {
          return response.json().then(result => {
            console.log(`Successfully deleted ${result.deletedCount} question set(s) from database`)
          })
        } else {
          console.warn('Failed to delete questions from database:', response.statusText)
        }
      }).catch(error => {
        console.warn('Error deleting questions from database:', error)
      })
    )
    
    // Clear preset state from database
    promises.push(saveCurrentPreset(null))
    
    // Wait for all operations but don't throw on error
    try {
      await Promise.all(promises)
    } catch (error) {
      console.warn('Some cleanup operations failed:', error)
      // Don't throw - we don't want to break the UI flow
    }
  }

  // New: Check if preset replacement is needed
  const needsPresetReplacement = (presetId: string): boolean => {
    return currentPreset ? currentPreset.id !== presetId : false
  }

  const handleGenerateQuestions = async (
    difficulty: 'easy' | 'medium' | 'hard', 
    loopData: any, 
    customCount?: number,
    customPromptId?: string
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
    
    // Use custom count and prompt if provided, otherwise default generation
    const generationParams = { 
      difficulty, 
      loop, 
      groupId, 
      sessionId,
      ...(customCount && { customCount }),
      ...(customPromptId && { customPromptId })
    }
      
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

  // Enhanced method for generating questions based on preset distribution with cleanup
  const handleGenerateFromPreset = async (
    loopData: any, 
    distribution: { easy: number; medium: number; hard: number },
    presetInfo: { id: string; name: string; isCustom?: boolean }
  ) => {
    console.log('🎯 handleGenerateFromPreset called with:', {
      loopData: loopData ? `Loop ID: ${loopData.id}, hasTranscript: ${!!loopData.transcript}` : 'NULL/UNDEFINED',
      distribution,
      presetInfo
    })

    if (!loopData) {
      console.error('❌ No loop data available for question generation')
      toast.error('No loop data available for question generation')
      return
    }

    // Fixed logic: Check if preset is already selected AND has actual questions loaded
    const hasActualQuestions = (generatedCounts.easy + generatedCounts.medium + generatedCounts.hard) > 0
    const isPresetAlreadyActive = currentPreset && currentPreset.id === presetInfo.id && hasActualQuestions

    if (isPresetAlreadyActive) {
      console.log(`Preset ${presetInfo.name} is already selected and has questions loaded`)
      toast.info(`${presetInfo.name} preset is already active with questions loaded`)
      return
    }

    // If preset matches but no questions loaded, allow regeneration
    if (currentPreset && currentPreset.id === presetInfo.id && !hasActualQuestions) {
      console.log(`Preset ${presetInfo.name} matches but no questions loaded - regenerating`)
    }

    // Prevent duplicate generation while in progress
    if (generatingState.all) {
      console.log('Generation already in progress, skipping duplicate request')
      toast.info('Question generation is already in progress')
      return
    }

    // Clear existing questions before generating new ones
    console.log(`Generating questions for preset: ${presetInfo.name}`)
    await clearExistingQuestions()

    const { easy, medium, hard } = distribution
    const promises = []
    
    // Extract custom prompt ID if this is a custom preset
    const customPromptId = presetInfo.isCustom ? presetInfo.id : undefined

    try {
      setGeneratingState(prev => ({ ...prev, all: true }))

      // Generate questions for each difficulty based on preset distribution
      // Break down larger counts into smaller batches for quality (5-8 questions per batch)
      const MAX_BATCH_SIZE = 8

      if (easy > 0) {
        const batches = Math.ceil(easy / MAX_BATCH_SIZE)
        for (let i = 0; i < batches; i++) {
          const batchSize = Math.min(MAX_BATCH_SIZE, easy - (i * MAX_BATCH_SIZE))
          promises.push(handleGenerateQuestions('easy', loopData, batchSize, customPromptId))
        }
      }

      if (medium > 0) {
        const batches = Math.ceil(medium / MAX_BATCH_SIZE)
        for (let i = 0; i < batches; i++) {
          const batchSize = Math.min(MAX_BATCH_SIZE, medium - (i * MAX_BATCH_SIZE))
          promises.push(handleGenerateQuestions('medium', loopData, batchSize, customPromptId))
        }
      }

      if (hard > 0) {
        const batches = Math.ceil(hard / MAX_BATCH_SIZE)
        for (let i = 0; i < batches; i++) {
          const batchSize = Math.min(MAX_BATCH_SIZE, hard - (i * MAX_BATCH_SIZE))
          promises.push(handleGenerateQuestions('hard', loopData, batchSize, customPromptId))
        }
      }

      console.log(`🚀 Starting ${promises.length} question generation batches`)
      await Promise.all(promises)

      // Set current preset after successful generation
      const newPreset = {
        id: presetInfo.id,
        name: presetInfo.name,
        distribution,
        createdAt: new Date()
      }
      setCurrentPreset(newPreset)
      
      // Save to database
      await saveCurrentPreset(newPreset)

      setGeneratingState(prev => ({ ...prev, all: false }))
      
      toast.success(`Successfully generated ${easy + medium + hard} questions from ${presetInfo.name} preset!`)
    } catch (error) {
      console.error('Failed to generate questions from preset:', error)
      setGeneratingState(prev => ({ ...prev, all: false }))
      toast.error('Failed to generate questions from preset')
      // Reset state on failure
      await clearExistingQuestions()
    }
  }

  return {
    generatingState,
    generatedCounts,
    shareTokens,
    currentPreset,
    setGeneratedCounts,
    setShareTokens,
    handleGenerateQuestions,
    handleGenerateAllQuestions,
    handleGenerateFromPreset,
    clearExistingQuestions,
    needsPresetReplacement,
    // Add loading state from shared hook
    questionsLoading
  }
}
