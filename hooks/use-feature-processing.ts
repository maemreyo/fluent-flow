// Custom hook for feature processing functionality
// Handles communication with background script for feature processing

import { useState, useCallback } from 'react'
import type { FeatureData, ProcessResult } from '../lib/types'
import { MESSAGE_TYPES } from '../lib/utils/constants'

interface UseFeatureProcessingReturn {
  processFeature: (data: FeatureData) => Promise<void>
  isLoading: boolean
  result: ProcessResult | null
  error: string | null
  clearResult: () => void
  clearError: () => void
}

export function useFeatureProcessing(): UseFeatureProcessingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processFeature = useCallback(async (data: FeatureData) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.PROCESS_FEATURE,
        data
      })

      if (response?.success) {
        setResult(response.data)
      } else {
        setError(response?.error || 'Failed to process feature')
      }
    } catch (err) {
      console.error('Feature processing error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    processFeature,
    isLoading,
    result,
    error,
    clearResult,
    clearError
  }
}