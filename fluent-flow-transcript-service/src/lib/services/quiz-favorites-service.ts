import { supabase, getCurrentUser } from '../supabase/client'

export interface FavoriteQuiz {
  id: string
  sessionId: string
  questionSetTitle: string
  videoTitle: string
  videoUrl?: string
  difficulty: string
  totalQuestions: number
  userScore?: number
  favoriteAt: Date
}

export class QuizFavoritesService {
  private readonly STORAGE_KEY = 'fluent_flow_favorite_quizzes'

  /**
   * Add a quiz to favorites
   */
  async addToFavorites(quiz: Omit<FavoriteQuiz, 'id' | 'favoriteAt'>): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        // Save to Supabase for authenticated users
        const { error } = await supabase.from('favorite_quizzes').insert({
          user_id: user.id,
          session_id: quiz.sessionId,
          question_set_title: quiz.questionSetTitle,
          video_title: quiz.videoTitle,
          video_url: quiz.videoUrl,
          difficulty: quiz.difficulty,
          total_questions: quiz.totalQuestions,
          user_score: quiz.userScore,
          created_at: new Date().toISOString()
        })
        
        if (error) throw error
      } else {
        // Fallback to local storage
        const favorites = await this.getFavorites()
        const newFavorite: FavoriteQuiz = {
          ...quiz,
          id: `local_${Date.now()}`,
          favoriteAt: new Date()
        }
        
        // Check if already favorited
        const exists = favorites.some(f => f.sessionId === quiz.sessionId)
        if (exists) return false
        
        const updated = [newFavorite, ...favorites].slice(0, 50) // Keep max 50
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated))
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to add quiz to favorites:', error)
      return false
    }
  }

  /**
   * Remove a quiz from favorites
   */
  async removeFromFavorites(sessionId: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        // Remove from Supabase
        const { error } = await supabase
          .from('favorite_quizzes')
          .delete()
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
        
        if (error) throw error
      } else {
        // Remove from local storage
        const favorites = await this.getFavorites()
        const filtered = favorites.filter(f => f.sessionId !== sessionId)
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to remove quiz from favorites:', error)
      return false
    }
  }

  /**
   * Check if a quiz is favorited
   */
  async isFavorited(sessionId: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        const { data, error } = await supabase
          .from('favorite_quizzes')
          .select('id')
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
          .single()
        
        return !error && !!data
      } else {
        const favorites = await this.getFavorites()
        return favorites.some(f => f.sessionId === sessionId)
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Get all favorite quizzes
   */
  async getFavorites(): Promise<FavoriteQuiz[]> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        const { data, error } = await supabase
          .from('favorite_quizzes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        return (data || []).map((item: any) => ({
          id: item.id,
          sessionId: item.session_id,
          questionSetTitle: item.question_set_title,
          videoTitle: item.video_title,
          videoUrl: item.video_url,
          difficulty: item.difficulty,
          totalQuestions: item.total_questions,
          userScore: item.user_score,
          favoriteAt: new Date(item.created_at)
        }))
      } else {
        // Get from local storage
        if (typeof window === 'undefined') return []
        
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (!stored) return []
        
        const parsed = JSON.parse(stored)
        return parsed.map((item: any) => ({
          ...item,
          favoriteAt: new Date(item.favoriteAt)
        }))
      }
    } catch (error) {
      console.error('Failed to get favorite quizzes:', error)
      return []
    }
  }

  /**
   * Clear all favorites (for cleanup/testing)
   */
  async clearFavorites(): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      
      if (user && supabase) {
        const { error } = await supabase
          .from('favorite_quizzes')
          .delete()
          .eq('user_id', user.id)
        
        if (error) throw error
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(this.STORAGE_KEY)
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to clear favorites:', error)
      return false
    }
  }
}

export const quizFavoritesService = new QuizFavoritesService()