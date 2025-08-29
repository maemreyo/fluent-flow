import { getCurrentUser, supabase } from '../supabase/client'
import type { CollocationPattern, UsageExample } from './contextual-learning-ai-service'
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
        .maybeSingle()

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

      const { data, error } = await supabase
        .from('transcript_summaries')
        .insert({
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

  /**
   * Save contextual learning data (examples + collocations) to vocabulary_analysis metadata
   */
  async saveContextualLearningData(
    loopId: string,
    vocabularyId: string,
    examples: UsageExample[],
    collocations: CollocationPattern[]
  ): Promise<{ id: string } | null> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, skipping contextual learning save')
        return null
      }

      // Get existing vocabulary analysis
      const { data: existing, error: getError } = await supabase
        .from('vocabulary_analysis')
        .select('*')
        .eq('user_id', user.id)
        .eq('loop_id', loopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (getError || !existing) {
        console.warn('No existing vocabulary analysis found for contextual learning data')
        return null
      }

      // Update with contextual learning data
      const existingMeta = (existing.metadata as Record<string, any>) || {}
      const updatedMetadata = {
        ...existingMeta,
        contextualLearning: {
          examples,
          collocations,
          vocabularyId,
          generatedAt: new Date().toISOString(),
          exampleCount: examples.length,
          collocationCount: collocations.length
        }
      }

      const { data, error } = await supabase
        .from('vocabulary_analysis')
        .update({ metadata: updatedMetadata as any })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (error) throw error

      console.log(`Contextual learning data saved for vocabulary ${vocabularyId} in loop ${loopId}`)
      return { id: data.id }
    } catch (error) {
      console.error('Failed to save contextual learning data:', error)
      return null
    }
  }

  /**
   * Get cached contextual learning data from vocabulary_analysis metadata
   */
  async getContextualLearningData(
    loopId: string,
    vocabularyId: string
  ): Promise<{
    examples: UsageExample[]
    collocations: CollocationPattern[]
  } | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('vocabulary_analysis')
        .select('metadata')
        .eq('user_id', user.id)
        .eq('loop_id', loopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) return null

      const contextualLearning = (data.metadata as any)?.contextualLearning
      if (!contextualLearning || contextualLearning.vocabularyId !== vocabularyId) {
        return null
      }

      return {
        examples: contextualLearning.examples || [],
        collocations: contextualLearning.collocations || []
      }
    } catch (error) {
      console.error('Failed to get contextual learning data:', error)
      return null
    }
  }

  /**
   * Check if contextual learning data exists in vocabulary_analysis metadata
   */
  async hasContextualLearningData(loopId: string, vocabularyId: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const { data, error } = await supabase
        .from('vocabulary_analysis')
        .select('metadata')
        .eq('user_id', user.id)
        .eq('loop_id', loopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) return false

      const contextualLearning = (data.metadata as any)?.contextualLearning
      return (
        contextualLearning?.vocabularyId === vocabularyId &&
        contextualLearning?.examples?.length > 0
      )
    } catch (error) {
      console.error('Failed to check contextual learning data:', error)
      return false
    }
  }

  /**
   * Save contextual learning data for standalone vocabulary (not loop-specific)
   */
  async saveStandaloneContextualData(
    vocabularyText: string,
    vocabularyId: string,
    examples: UsageExample[],
    collocations: CollocationPattern[]
  ): Promise<{ id: string } | null> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No user authenticated, skipping contextual learning save')
        return null
      }

      const metadata = {
        exampleCount: examples.length,
        collocationCount: collocations.length,
        generatedAt: new Date().toISOString(),
        isStandalone: true
      }

      // Use the PostgreSQL function to handle upsert with partial constraints
      const { data, error } = await supabase.rpc('upsert_contextual_learning_data', {
        p_user_id: user.id,
        p_vocabulary_text: vocabularyText,
        p_vocabulary_id: vocabularyId,
        p_loop_id: null, // Standalone data
        p_examples: examples as any,
        p_collocations: collocations as any,
        p_metadata: metadata as any
      })

      if (error) {
        console.error('Database error in saveStandaloneContextualData:', error)
        return null
      }

      console.log(`Saved standalone contextual learning data for vocabulary: ${vocabularyText}`)
      return { id: data }
    } catch (error) {
      console.error('Failed to save standalone contextual learning data:', error)
      return null
    }
  }

  /**
   * Get standalone contextual learning data by vocabulary text
   */
  async getStandaloneContextualData(
    vocabularyText: string
  ): Promise<{
    examples: UsageExample[]
    collocations: CollocationPattern[]
  } | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('contextual_learning_data')
        .select('examples, collocations')
        .eq('user_id', user.id)
        .eq('vocabulary_text', vocabularyText)
        .is('loop_id', null) // Use is.null instead of eq.null
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) return null

      return {
        examples: (data.examples as any[]) || [],
        collocations: (data.collocations as any[]) || []
      }
    } catch (error) {
      console.error('Failed to get standalone contextual learning data:', error)
      return null
    }
  }

  /**
   * Check if standalone contextual learning data exists
   */
  async hasStandaloneContextualData(vocabularyText: string): Promise<boolean> {
    try {
      const user = await getCurrentUser()
      if (!user) return false

      const { data, error } = await supabase
        .from('contextual_learning_data')
        .select('id')
        .eq('user_id', user.id)
        .eq('vocabulary_text', vocabularyText)
        .is('loop_id', null) // Use is.null instead of eq.null
        .limit(1)
        .maybeSingle()

      return !error && !!data
    } catch (error) {
      console.error('Failed to check standalone contextual learning data:', error)
      return false
    }
  }
}

// Export singleton instance
export const vocabularyDatabaseService = new VocabularyDatabaseService()
