import { useState, useEffect } from 'react'
import { 
  quizResultsService, 
  QuizResult, 
  SessionStats 
} from '../lib/services/quiz-results-service'

interface UseQuizResultsReturn {
  results: QuizResult[]
  stats: SessionStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useQuizResults(groupId: string, sessionId: string): UseQuizResultsReturn {
  const [results, setResults] = useState<QuizResult[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = async () => {
    if (!groupId || !sessionId) return

    setLoading(true)
    setError(null)
    
    try {
      const data = await quizResultsService.fetchQuizResults(groupId, sessionId)
      setResults(data.results || [])
      setStats(data.stats)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch results'
      setError(errorMessage)
      console.error('Error fetching results:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [groupId, sessionId])

  return {
    results,
    stats,
    loading,
    error,
    refetch: fetchResults
  }
}