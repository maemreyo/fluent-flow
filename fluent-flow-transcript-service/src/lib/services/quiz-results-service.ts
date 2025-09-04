import { supabase } from '../supabase/client'
import { getAuthHeaders } from '../supabase/auth-utils'

export interface QuizResult {
  id: string
  user_id: string
  user_name: string | null
  user_email?: string | null
  username?: string | null
  score: number
  total_questions: number
  correct_answers: number
  time_taken_seconds?: number
  completed_at: string
  result_data: any
}

export interface SessionStats {
  total_participants: number
  average_score: number
  highest_score: number
  completion_rate: number
}

export interface QuizResultsResponse {
  session: any
  results: QuizResult[]
  stats: SessionStats
}

class QuizResultsService {
  async fetchQuizResults(groupId: string, sessionId: string): Promise<QuizResultsResponse> {
    const headers = await getAuthHeaders()
    const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`, {
      headers
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to fetch quiz results: ${response.status}`)
    }

    return response.json()
  }

  async submitQuizResult(groupId: string, sessionId: string, result: {
    score: number
    total_questions: number
    correct_answers: number
    time_taken_seconds?: number
    result_data?: any
  }): Promise<any> {
    const headers = await getAuthHeaders()
    const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`, {
      method: 'POST',
      headers,
      body: JSON.stringify(result)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to submit quiz result: ${response.status}`)
    }

    return response.json()
  }
}

// Export singleton instance
export const quizResultsService = new QuizResultsService()