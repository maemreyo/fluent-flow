import { QuestionSet } from '../../../components/questions/QuestionSetInfo'
import { quizFavoritesService } from '../../../lib/services/quiz-favorites-service'

export const fetchQuestionSet = async (token: string): Promise<QuestionSet> => {
  const response = await fetch(`/api/questions/${token}`)
  if (!response.ok) {
    // Parse error response for better error handling
    try {
      const errorData = await response.json()
      console.log('errorData', errorData)
      if (errorData.isExpired) {
        // Create a special expired error that can be handled differently
        const expiredError = new Error(errorData.message || 'This quiz session has expired')
        ;(expiredError as any).isExpired = true
        ;(expiredError as any).expiredAt = errorData.expiredAt
        throw expiredError
      } else {
        throw new Error(errorData.error || 'Failed to load questions')
      }
    } catch (jsonError) {
      // If JSON parsing fails, use generic error
      throw new Error('Failed to load questions')
    }
  }
  return response.json()
}

export const isFavorited = async (token: string): Promise<boolean> => {
  return quizFavoritesService.isFavorited(token)
}

export const addToFavorites = async (data: {
  sessionId: string
  questionSetTitle: string
  videoTitle: string
  videoUrl?: string
  difficulty: string
  totalQuestions: number
  userScore?: number
}): Promise<boolean> => {
  return quizFavoritesService.addToFavorites(data)
}

export const removeFromFavorites = async (token: string): Promise<boolean> => {
  return quizFavoritesService.removeFromFavorites(token)
}

export const submitSet = async (token: string, submissionData: any): Promise<any> => {
  const response = await fetch(`/api/questions/${token}/submit-set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submissionData)
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Failed to submit: ${response.status} ${errorData}`)
  }

  // The submit-set endpoint doesn't return the final results,
  // the logic to calculate them is in the hook.
  // We might need to adjust this. For now, let's assume it returns a success status.
  return { success: true }
}
