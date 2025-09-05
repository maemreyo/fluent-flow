'use client'

import { useEffect } from 'react'
import { Bot } from 'lucide-react'
import { toast } from 'sonner'

interface UseQuizStartupProps {
  sessionQuestions: any
  setGeneratedCounts: (counts: any) => void
  setShareTokens: (tokens: any) => void
  handlePresetSelect: (preset: any, shareTokens: Record<string, string>) => void
  generatedCounts: { easy: number; medium: number; hard: number }
}

export function useQuizStartup({
  sessionQuestions,
  setGeneratedCounts,
  setShareTokens,
  handlePresetSelect,
  generatedCounts
}: UseQuizStartupProps) {
  // Load existing questions into state on mount
  useEffect(() => {
    if (sessionQuestions?.questionsByDifficulty) {
      const counts = { easy: 0, medium: 0, hard: 0 }
      const tokens: Record<string, string> = {}

      Object.entries(sessionQuestions.questionsByDifficulty).forEach(([difficulty, data]: [string, any]) => {
        if (difficulty === 'mixed') {
          counts.easy = data.count || 0
          counts.medium = data.count || 0 
          counts.hard = data.count || 0
        } else if (['easy', 'medium', 'hard'].includes(difficulty)) {
          counts[difficulty as 'easy' | 'medium' | 'hard'] = data.count || 0
          tokens[difficulty] = data.shareToken
        }
      })

      setGeneratedCounts(counts)
      setShareTokens(tokens)
    }
  }, [sessionQuestions, setGeneratedCounts, setShareTokens])

  const handleStartQuiz = async (shareTokensForQuiz: Record<string, string>) => {
    console.log('Starting quiz with shareTokens:', shareTokensForQuiz)
    
    const availableTokens = Object.entries(shareTokensForQuiz).filter(([_, token]) => token)
    if (availableTokens.length === 0) {
      toast.error('No questions available to start quiz')
      return
    }

    try {
      const generatedPreset = {
        id: 'generated',
        name: 'Generated Questions',
        description: 'AI Generated Questions',
        icon: Bot,
        distribution: generatedCounts,
        totalQuestions: Object.values(generatedCounts).reduce((sum, count) => sum + count, 0)
      }

      handlePresetSelect(generatedPreset, shareTokensForQuiz)
    } catch (error) {
      console.error('Failed to start quiz with generated questions:', error)
      toast.error('Failed to start quiz. Please try again.')
    }
  }

  return {
    handleStartQuiz
  }
}