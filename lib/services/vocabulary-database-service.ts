import { getCurrentUser, supabase } from '../supabase/client'
import type {
  TranscriptSummary,
  VocabularyAnalysisResult,
  VocabularyPhrase,
  VocabularyWord
} from './vocabulary-analysis-service'

export class VocabularyDatabaseService {
  /**
   * Save vocabulary analysis to database
   */
  async saveVocabularyAnalysis(
    loopId: string,
    analysis: VocabularyAnalysisResult,
    metadata?: {
      transcriptLength?: number
      transcriptLanguage?: string
      segmentCount?: number
      generatedAt?: string
    }
  ): Promise<{ id: string } | null> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, skipping vocabulary save')
        return null
      }

      const { data, error } = await (
        supabase.from('vocabulary_analysis').insert({
          user_id: user.id,
          loop_id: loopId,
          words: analysis.words as any,
          phrases: analysis.phrases as any,
          difficulty_level: analysis.difficultyLevel,
          total_words: analysis.totalWords,
          unique_words: analysis.uniqueWords,
          suggested_focus_words: analysis.suggestedFocusWords as any,
          metadata: {
            ...metadata,
            analysisVersion: '1.0',
            totalItems: (analysis.words?.length || 0) + (analysis.phrases?.length || 0),
            createdAt: new Date().toISOString()
          } as any
        }) as any
      )
        .select('id')
        .single()

      if (error) throw error

      console.log(`Vocabulary analysis saved for loop ${loopId}`)
      return { id: data.id }
    } catch (error) {
      console.error('Failed to save vocabulary analysis:', error)
      return null
    }
  }

  /**
   * Get cached vocabulary analysis from database
   */
  async getVocabularyAnalysis(loopId: string): Promise<VocabularyAnalysisResult | null> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, skipping vocabulary retrieval')
        return null
      }

      const { data, error } = await supabase
        .from('vocabulary_analysis')
        .select('*')
        .eq('user_id', user.id)
        .eq('loop_id', loopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return {
        words: (data.words as unknown as VocabularyWord[]) || [],
        phrases: (data.phrases as unknown as VocabularyPhrase[]) || [],
        difficultyLevel:
          (data.difficulty_level as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
        totalWords: data.total_words || 0,
        uniqueWords: data.unique_words || 0,
        suggestedFocusWords: (data.suggested_focus_words as unknown as string[]) || []
      }
    } catch (error) {
      console.error('Failed to get vocabulary analysis:', error)
      return null
    }
  }

  /**
   * Save transcript summary to database
   */
  async saveTranscriptSummary(
    loopId: string,
    summary: TranscriptSummary,
    metadata?: {
      transcriptLength?: number
      transcriptLanguage?: string
      segmentCount?: number
      generatedAt?: string
    }
  ): Promise<{ id: string } | null> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, skipping summary save')
        return null
      }

      const { data, error } = await (
        supabase.from('transcript_summaries').insert({
          user_id: user.id,
          loop_id: loopId,
          main_points: summary.keyPoints,
          key_insights: summary.topics,
          difficulty_assessment: summary.difficulty,
          recommended_focus_areas: [summary.summary],
          metadata: {
            ...metadata,
            summaryVersion: '1.0',
            pointCount: summary.keyPoints?.length || 0,
            insightCount: summary.topics?.length || 0,
            createdAt: new Date().toISOString()
          }
        })
      )
        .select('id')
        .single()

      if (error) throw error

      console.log(`Transcript summary saved for loop ${loopId}`)
      return { id: data.id }
    } catch (error) {
      console.error('Failed to save transcript summary:', error)
      return null
    }
  }

  /**
   * Get cached transcript summary from database
   */
  async getTranscriptSummary(loopId: string): Promise<TranscriptSummary | null> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, skipping summary retrieval')
        return null
      }

      const { data, error } = await supabase
        .from('transcript_summaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('loop_id', loopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return {
        summary: (data.recommended_focus_areas as string[])?.[0] || '',
        keyPoints: (data.main_points as string[]) || [],
        topics: (data.key_insights as string[]) || [],
        difficulty:
          (data.difficulty_assessment as 'beginner' | 'intermediate' | 'advanced') ||
          'intermediate',
        estimatedReadingTime: 5 // Default reading time
      }
    } catch (error) {
      console.error('Failed to get transcript summary:', error)
      return null
    }
  }

  /**
   * Delete vocabulary analysis for a loop
   */
  async deleteVocabularyAnalysis(loopId: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const { error } = await supabase
        .from('vocabulary_analysis')
        .delete()
        .eq('user_id', user.id)
        .eq('loop_id', loopId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to delete vocabulary analysis:', error)
      return false
    }
  }

  /**
   * Delete transcript summary for a loop
   */
  async deleteTranscriptSummary(loopId: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const { error } = await supabase
        .from('transcript_summaries')
        .delete()
        .eq('user_id', user.id)
        .eq('loop_id', loopId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to delete transcript summary:', error)
      return false
    }
  }

  /**
   * Get vocabulary statistics for user
   */
  async getVocabularyStats(): Promise<{
    totalWords: number
    totalPhrases: number
    uniqueWords: number
    mostCommonDifficulty: string
  }> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        return {
          totalWords: 0,
          totalPhrases: 0,
          uniqueWords: 0,
          mostCommonDifficulty: 'intermediate'
        }
      }

      const { data, error } = await supabase
        .from('vocabulary_analysis')
        .select('words, phrases, difficulty_level')
        .eq('user_id', user.id)

      if (error) throw error

      let totalWords = 0
      let totalPhrases = 0
      const uniqueWordsSet = new Set<string>()
      const difficultyCount: Record<string, number> = {}

      data.forEach(analysis => {
        if (Array.isArray(analysis.words)) {
          totalWords += analysis.words.length
          analysis.words.forEach((word: any) => {
            if (word.word) uniqueWordsSet.add(word.word.toLowerCase())
          })
        }

        if (Array.isArray(analysis.phrases)) {
          totalPhrases += analysis.phrases.length
        }

        if (analysis.difficulty_level) {
          difficultyCount[analysis.difficulty_level] =
            (difficultyCount[analysis.difficulty_level] || 0) + 1
        }
      })

      const mostCommonDifficulty =
        Object.entries(difficultyCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'intermediate'

      return {
        totalWords,
        totalPhrases,
        uniqueWords: uniqueWordsSet.size,
        mostCommonDifficulty
      }
    } catch (error) {
      console.error('Failed to get vocabulary stats:', error)
      return {
        totalWords: 0,
        totalPhrases: 0,
        uniqueWords: 0,
        mostCommonDifficulty: 'intermediate'
      }
    }
  }
}

// Export singleton instance
export const vocabularyDatabaseService = new VocabularyDatabaseService()
