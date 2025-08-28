import { useCallback, useRef, useState } from 'react'
import { QuestionSharingService } from '../services/question-sharing-service'
import type {
  ConversationQuestions,
  QuestionResponse,
  SavedLoop,
  SharedQuestionSession,
  SharedQuestionSet
} from '../types/fluent-flow-types'

interface UseQuestionSharingConfig {
  backendUrl?: string
  apiKey?: string
}

export const useQuestionSharing = (config: UseQuestionSharingConfig = {}) => {
  const [isSharing, setIsSharing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)

  const sharingServiceRef = useRef(
    new QuestionSharingService({
      backendUrl:
        config.backendUrl || process.env.PLASMO_PUBLIC_BACKEND_URL || 'http://localhost:3838',
      apiKey: config.apiKey
    })
  )

  const shareQuestions = useCallback(
    async (
      questions: ConversationQuestions,
      loop: SavedLoop,
      options: {
        title?: string
        isPublic?: boolean
        sharedBy?: string
      } = {}
    ) => {
      setIsSharing(true)
      setError(null)

      try {
        const result = await sharingServiceRef.current.shareQuestions(questions, loop, options)
        setShareUrl(result.shareUrl)
        setShareToken(result.shareToken)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to share questions'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsSharing(false)
      }
    },
    []
  )

  const getSharedQuestions = useCallback(async (token: string): Promise<SharedQuestionSet> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await sharingServiceRef.current.getSharedQuestions(token)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load questions'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const submitAnswers = useCallback(
    async (token: string, responses: QuestionResponse[]): Promise<SharedQuestionSession> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await sharingServiceRef.current.submitAnswers(token, responses)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit answers'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const getSessionResults = useCallback(
    async (sessionId: string): Promise<SharedQuestionSession> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await sharingServiceRef.current.getSessionResults(sessionId)
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load results'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      const success = await sharingServiceRef.current.copyToClipboard(text)
      return success
    } catch (err) {
      console.error('Copy to clipboard failed:', err)
      return false
    }
  }, [])

  const validateConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = await sharingServiceRef.current.validateConnection()
      return isValid
    } catch (err) {
      console.error('Connection validation failed:', err)
      return false
    }
  }, [])

  const reset = useCallback(() => {
    setIsSharing(false)
    setIsLoading(false)
    setError(null)
    setShareUrl(null)
    setShareToken(null)
  }, [])

  const updateConfig = useCallback((newConfig: Partial<UseQuestionSharingConfig>) => {
    sharingServiceRef.current.updateConfig({
      backendUrl: newConfig.backendUrl,
      apiKey: newConfig.apiKey
    })
  }, [])

  return {
    // State
    isSharing,
    isLoading,
    error,
    shareUrl,
    shareToken,

    // Actions
    shareQuestions,
    getSharedQuestions,
    submitAnswers,
    getSessionResults,
    copyToClipboard,
    validateConnection,
    reset,
    updateConfig
  }
}

export default useQuestionSharing
