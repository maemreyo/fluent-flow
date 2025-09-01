import { quizFavoritesService } from '../../../lib/services/quiz-favorites-service'
import { QuestionSet } from '../../../components/questions/QuestionSetInfo'

export const fetchQuestionSet = async (
  token: string
): Promise<QuestionSet> => {
  const response = await fetch(`/api/questions/${token}`)
  if (!response.ok) {
    throw new Error('Failed to load questions')
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

export const submitSet = async (
  token: string,
  submissionData: any
): Promise<any> => {
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
