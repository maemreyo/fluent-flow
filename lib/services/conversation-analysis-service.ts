// Enhanced Conversation Analysis Service using AIService
// This replaces the direct Gemini implementation with the universal AIService

import { createAIService } from './ai-service'
import type { AIService } from './ai-service'
import type {
  ConversationQuestion,
  ConversationQuestions,
  SavedLoop
} from '../types/fluent-flow-types'

export interface GeminiConfig {
  apiKey: string
  baseURL?: string
  model?: string
}

export class ConversationAnalysisService {
  private aiService: AIService | null = null

  constructor(private preferredProvider: 'openai' | 'anthropic' | 'google' = 'google') {}

  /**
   * Initialize the AI service (lazy loading)
   */
  private async getAIService(): Promise<AIService> {
    if (!this.aiService) {
      this.aiService = await createAIService(this.preferredProvider)
    }
    return this.aiService
  }

  /**
   * Generate questions from a loop (main method expected by integration service)
   */
  async generateQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
    // Always use transcript-based generation now
    return this.generateFallbackQuestions(loop)
  }

  /**
   * Generate questions from transcript text using AI
   */
  async generateQuestionsFromTranscript(
    loop: SavedLoop,
    transcript: string
  ): Promise<ConversationQuestions> {
    // Validate inputs
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content provided')
    }

    try {
      const aiService = await this.getAIService()
      const result = await aiService.generateConversationQuestions(loop, transcript)

      // Ensure we have exactly 15 questions
      const questions = result.questions || []
      while (questions.length < 15) {
        const fallbackQuestions = this.generateFallbackQuestions(loop, transcript)
        questions.push(...fallbackQuestions.questions.slice(questions.length, 15))
      }

      const duration = loop.endTime - loop.startTime

      return {
        loopId: loop.id,
        questions: questions.slice(0, 15),
        metadata: {
          totalQuestions: 15,
          analysisDate: new Date().toISOString(),
          generatedFromTranscript: true,
          transcriptLength: transcript.length,
          transcriptSegmentCount: 0, // We don't have segment data here
          transcriptLanguage: 'en',
          canRegenerateQuestions: true,
          videoAnalysis: true,
          videoSegmentDuration: duration
        }
      }
    } catch (error) {
      console.error('AI-based question generation failed:', error)
      console.log('Falling back to template questions')

      // Fall back to template questions if AI fails
      const fallback = this.generateFallbackQuestions(loop, transcript)
      return fallback
    }
  }

  /**
   * Validate AI service configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      await this.getAIService()
      return true
    } catch (error) {
      console.error('AI service validation failed:', error)
      return false
    }
  }

  /**
   * Change AI provider (useful for switching between different AI services)
   */
  async switchProvider(provider: 'openai' | 'anthropic' | 'google'): Promise<void> {
    this.preferredProvider = provider
    this.aiService = null // Reset to force re-initialization
  }

  /**
   * Get current AI provider
   */
  getCurrentProvider(): string {
    return this.preferredProvider
  }

  /**
   * Update configuration (legacy compatibility)
   */
  updateConfig(_config: { apiKey: string }): void {
    // This method exists for legacy compatibility
    // The new service handles configuration automatically
    console.log('updateConfig called - configuration is now handled automatically')
  }

  /**
   * Estimate token usage for a given input
   */
  estimateTokenUsage(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }


  /**
   * Generate fallback questions when AI analysis is not available
   */
  private generateFallbackQuestions(loop: SavedLoop, transcript?: string): ConversationQuestions {
    const baseQuestions: Omit<ConversationQuestion, 'id'>[] = [
      {
        question: 'What is the main topic discussed in this video segment?',
        options: [
          'Current events and news',
          'Educational content',
          'Entertainment and lifestyle',
          'Technical or professional topics'
        ],
        correctAnswer: 'B',
        explanation: 'This appears to be educational content based on the video context.',
        difficulty: 'easy',
        type: 'main_idea'
      },
      {
        question: 'What key vocabulary words can you identify from this segment?',
        options: [
          'Basic everyday words only',
          'Some specialized terminology',
          'Advanced academic vocabulary',
          'Technical jargon exclusively'
        ],
        correctAnswer: 'B',
        explanation: 'Most educational content contains a mix of common and specialized terms.',
        difficulty: 'medium',
        type: 'vocabulary_in_context'
      },
      {
        question: "What is the speaker's main purpose in this segment?",
        options: [
          'To entertain the audience',
          'To inform or educate viewers',
          'To sell a product or service',
          'To express personal opinions only'
        ],
        correctAnswer: 'B',
        explanation: 'Educational videos typically aim to inform and teach viewers.',
        difficulty: 'easy',
        type: 'inference'
      },
      {
        question: 'How would you describe the complexity of the language used?',
        options: [
          'Very simple, basic level',
          'Intermediate with some challenges',
          'Advanced and complex throughout',
          'Mixed levels depending on topic'
        ],
        correctAnswer: 'D',
        explanation:
          'Most educational content adapts language complexity based on the concepts being explained.',
        difficulty: 'medium',
        type: 'language_function'
      },
      {
        question: 'What details support the main ideas presented?',
        options: [
          'Personal anecdotes only',
          'Statistical data and facts',
          'Examples and explanations',
          'All of the above'
        ],
        correctAnswer: 'D',
        explanation:
          'Effective educational content typically uses multiple types of supporting details.',
        difficulty: 'medium',
        type: 'specific_detail'
      },
      {
        question: 'What can you infer about the target audience of this video?',
        options: [
          'Complete beginners in the subject',
          'Intermediate learners seeking improvement',
          'Advanced professionals in the field',
          'General audience with mixed backgrounds'
        ],
        correctAnswer: 'D',
        explanation: 'Educational videos typically target a general audience with varied backgrounds.',
        difficulty: 'medium',
        type: 'inference'
      },
      {
        question: 'Which aspect of language learning does this segment emphasize most?',
        options: [
          'Reading comprehension skills',
          'Writing and composition',
          'Listening and comprehension',
          'Speaking and pronunciation'
        ],
        correctAnswer: 'C',
        explanation: 'Video content primarily focuses on listening and comprehension skills.',
        difficulty: 'easy',
        type: 'main_idea'
      },
      {
        question: 'What tone does the speaker adopt throughout this segment?',
        options: [
          'Formal and academic',
          'Casual and conversational',
          'Serious and authoritative',
          'Varies depending on content'
        ],
        correctAnswer: 'D',
        explanation: 'Educational speakers often adapt their tone based on the content being discussed.',
        difficulty: 'hard',
        type: 'speaker_tone'
      },
      {
        question: 'What organizational pattern is used to present the information?',
        options: [
          'Chronological order',
          'Problem-solution format',
          'Compare and contrast',
          'Sequential steps or topics'
        ],
        correctAnswer: 'D',
        explanation: 'Educational content typically follows a sequential or topical organization.',
        difficulty: 'medium',
        type: 'language_function'
      },
      {
        question: 'Which learning strategy would be most effective for this type of content?',
        options: [
          'Memorization and repetition',
          'Active listening with note-taking',
          'Translation to native language',
          'Focus only on individual words'
        ],
        correctAnswer: 'B',
        explanation: 'Active listening with note-taking is most effective for educational video content.',
        difficulty: 'medium',
        type: 'inference'
      },
      {
        question: 'What makes this segment challenging for English learners?',
        options: [
          'Complex grammatical structures only',
          'Fast speaking pace throughout',
          'Technical vocabulary and concepts',
          'Combination of various factors'
        ],
        correctAnswer: 'D',
        explanation: 'Educational content challenges learners through multiple linguistic and conceptual factors.',
        difficulty: 'hard',
        type: 'vocabulary_in_context'
      },
      {
        question: 'How does the speaker engage with the audience?',
        options: [
          'Through direct questions only',
          'Using examples and illustrations',
          'With formal academic language',
          'Multiple engagement strategies'
        ],
        correctAnswer: 'D',
        explanation: 'Effective educators use various strategies to engage their audience.',
        difficulty: 'medium',
        type: 'language_function'
      },
      {
        question: 'What cultural knowledge might enhance understanding of this content?',
        options: [
          'No cultural knowledge needed',
          'Basic understanding of context',
          'Deep cultural familiarity required',
          'Varies with specific topics discussed'
        ],
        correctAnswer: 'D',
        explanation: 'Cultural knowledge requirements vary depending on the specific content being discussed.',
        difficulty: 'hard',
        type: 'inference'
      },
      {
        question: 'What listening skills are being developed through this segment?',
        options: [
          'Understanding main ideas only',
          'Identifying specific details',
          'Following logical connections',
          'All of the above'
        ],
        correctAnswer: 'D',
        explanation: 'Comprehensive listening involves multiple sub-skills working together.',
        difficulty: 'easy',
        type: 'specific_detail'
      },
      {
        question: 'How can learners best prepare for similar content?',
        options: [
          'Focus on grammar rules only',
          'Build relevant vocabulary first',
          'Practice listening to similar materials',
          'Combine multiple preparation strategies'
        ],
        correctAnswer: 'D',
        explanation: 'Effective preparation involves multiple complementary strategies.',
        difficulty: 'medium',
        type: 'language_function'
      }
    ]

    // Generate 15 questions with unique IDs, cycling through base questions if needed
    const questions: ConversationQuestion[] = Array.from({ length: 15 }, (_, index) => {
      const baseQuestion = baseQuestions[index % baseQuestions.length]
      return {
        ...baseQuestion,
        id: `q_${loop.id}_${index + 1}`,
        timestamp: loop.startTime + (index * (loop.endTime - loop.startTime)) / 15
      }
    })

    const duration = loop.endTime - loop.startTime

    return {
      loopId: loop.id,
      questions,
      metadata: {
        totalQuestions: 15,
        analysisDate: new Date().toISOString(),
        generatedFromTranscript: !!transcript,
        transcriptLength: transcript?.length,
        transcriptSegmentCount: 0,
        transcriptLanguage: transcript ? 'en' : undefined,
        canRegenerateQuestions: true,
        videoAnalysis: true,
        videoSegmentDuration: duration
      }
    }
  }
}

// Legacy compatibility export
export default ConversationAnalysisService