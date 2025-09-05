import { getAuthHeaders } from '../lib/supabase/auth-utils'

export interface GenerateQuestionParams {
  loopId: string
  difficulty: 'easy' | 'medium' | 'hard'
  groupId?: string
  sessionId?: string
}

export interface GenerateAllQuestionsParams {
  loopId: string
  groupId?: string
  sessionId?: string
}

export interface QuestionGenerationResult {
  difficulty: string
  count: number
  shareToken?: string
}

export interface GenerateAllQuestionsResult {
  results: QuestionGenerationResult[]
}

export class QuestionGenerationService {
  /**
   * Generate questions for a specific difficulty
   */
  static async generateQuestions(params: GenerateQuestionParams): Promise<QuestionGenerationResult> {
    const { loopId, difficulty, groupId, sessionId } = params
    
    const headers = await getAuthHeaders()
    const response = await fetch('/api/questions/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        loopId,
        difficulty,
        groupId,
        sessionId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate questions')
    }

    return response.json()
  }

  /**
   * Generate questions for all difficulties
   */
  static async generateAllQuestions(params: GenerateAllQuestionsParams): Promise<GenerateAllQuestionsResult> {
    const { loopId, groupId, sessionId } = params
    
    const headers = await getAuthHeaders()
    const response = await fetch('/api/questions/generate-all', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        loopId,
        groupId,
        sessionId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate all questions')
    }

    return response.json()
  }

  /**
   * Load questions from shareTokens for starting a quiz
   */
  static async loadQuestionsFromShareTokens(
    shareTokens: Record<string, string>,
    groupId: string,
    sessionId: string
  ) {
    const availableTokens = Object.entries(shareTokens).filter(([_, token]) => token)
    
    if (availableTokens.length === 0) {
      throw new Error('No questions available')
    }

    const questionPromises = availableTokens.map(async ([difficulty, shareToken]) => {
      const response = await fetch(`/api/questions/${shareToken}?groupId=${groupId}&sessionId=${sessionId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load ${difficulty} questions`)
      }
      
      const questionData = await response.json()
      return {
        difficulty,
        questions: questionData.questions || [],
        shareToken
      }
    })

    return Promise.all(questionPromises)
  }
}