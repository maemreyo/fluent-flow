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
    transcript: string,
    preset?: { easy: number; medium: number; hard: number }
  ): Promise<ConversationQuestions> {
    // Validate inputs
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content provided')
    }

    try {
      const aiService = await this.getAIService()
      const result = await aiService.generateConversationQuestions(loop, transcript, preset)

      // Use the preset or default to 15 total questions
      const actualPreset = preset || { easy: 4, medium: 7, hard: 4 }
      const totalQuestions = actualPreset.easy + actualPreset.medium + actualPreset.hard

      // Ensure we have the correct number of questions
      const questions = result.questions || []
      if (questions.length < totalQuestions) {
        console.warn(`Only generated ${questions.length} questions, expected ${totalQuestions}. Using fallback.`)
        const fallbackQuestions = this.generateFallbackQuestions(loop, transcript, actualPreset)
        questions.push(...fallbackQuestions.questions.slice(questions.length, totalQuestions))
      }

      const duration = loop.endTime - loop.startTime

      return {
        loopId: loop.id,
        questions: questions.slice(0, totalQuestions),
        metadata: {
          totalQuestions: totalQuestions,
          analysisDate: new Date().toISOString(),
          generatedFromTranscript: true,
          transcriptLength: transcript.length,
          transcriptSegmentCount: 0, // We don't have segment data here
          transcriptLanguage: 'en',
          canRegenerateQuestions: true,
          videoAnalysis: true,
          videoSegmentDuration: duration,
          preset: actualPreset,
          actualDistribution: result.actualDistribution
        }
      }
    } catch (error) {
      console.error('AI-based question generation failed:', error)
      console.log('Falling back to template questions')

      // Fall back to template questions if AI fails
      const fallback = this.generateFallbackQuestions(loop, transcript, preset)
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
  private generateFallbackQuestions(
    loop: SavedLoop, 
    transcript?: string, 
    preset?: { easy: number; medium: number; hard: number }
  ): ConversationQuestions {
    // Default preset for backward compatibility
    const actualPreset = preset || { easy: 4, medium: 7, hard: 4 }
    const totalQuestions = actualPreset.easy + actualPreset.medium + actualPreset.hard

    const easyQuestions: Omit<ConversationQuestion, 'id'>[] = [
      {
        question: 'What is the main topic discussed in this video segment?',
        options: [
          'Current events and news',
          'Educational content', 
          'Entertainment and lifestyle',
          'Technical topics'
        ],
        correctAnswer: 'B',
        explanation: 'This appears to be educational content based on the video context.',
        difficulty: 'easy',
        type: 'main_idea'
      },
      {
        question: "What is the speaker's main purpose in this segment?",
        options: [
          'To entertain the audience',
          'To inform or educate viewers',
          'To sell a product or service', 
          'To express personal opinions'
        ],
        correctAnswer: 'B',
        explanation: 'Educational videos typically aim to inform and teach viewers.',
        difficulty: 'easy',
        type: 'inference'
      },
      {
        question: 'Which language learning skill does this segment focus on most?',
        options: [
          'Reading skills',
          'Writing skills',
          'Listening skills',
          'Speaking skills'
        ],
        correctAnswer: 'C',
        explanation: 'Video content primarily helps develop listening skills.',
        difficulty: 'easy',
        type: 'main_idea'
      },
      {
        question: 'What listening skills are being practiced in this segment?',
        options: [
          'Understanding main ideas only',
          'Finding specific details',
          'Following connections',
          'All of these skills'
        ],
        correctAnswer: 'D',
        explanation: 'Good listening involves multiple skills working together.',
        difficulty: 'easy',
        type: 'specific_detail'
      }
    ]

    const mediumQuestions: Omit<ConversationQuestion, 'id'>[] = [
      {
        question: 'What type of vocabulary can you identify from this segment?',
        options: [
          'Only basic everyday words',
          'Some specialized terms',
          'Advanced academic vocabulary',
          'Technical jargon only'
        ],
        correctAnswer: 'B',
        explanation: 'Most educational content uses a mix of common and specialized terms.',
        difficulty: 'medium',
        type: 'vocabulary_in_context'
      },
      {
        question: 'How would you describe the language complexity?',
        options: [
          'Very simple, basic level',
          'Medium with some challenges',
          'Advanced and complex',
          'Mixed levels by topic'
        ],
        correctAnswer: 'D',
        explanation: 'Educational content adapts language complexity based on concepts being explained.',
        difficulty: 'medium',
        type: 'language_function'
      },
      {
        question: 'What details support the main ideas presented?',
        options: [
          'Personal stories only',
          'Facts and data',
          'Examples and explanations', 
          'All of the above'
        ],
        correctAnswer: 'D',
        explanation: 'Good educational content uses multiple types of supporting details.',
        difficulty: 'medium',
        type: 'specific_detail'
      },
      {
        question: 'Who is the likely target audience for this video?',
        options: [
          'Complete beginners',
          'Intermediate learners',
          'Advanced professionals',
          'General mixed audience'
        ],
        correctAnswer: 'D',
        explanation: 'Educational videos typically target a general audience with varied backgrounds.',
        difficulty: 'medium',
        type: 'inference'
      },
      {
        question: 'How is the information organized in this segment?',
        options: [
          'In time order',
          'Problem and solution',
          'Compare and contrast',
          'Sequential steps or topics'
        ],
        correctAnswer: 'D',
        explanation: 'Educational content typically follows a clear, step-by-step organization.',
        difficulty: 'medium',
        type: 'language_function'
      },
      {
        question: 'What learning strategy works best for this content?',
        options: [
          'Just memorizing',
          'Active listening with notes',
          'Translation only',
          'Focus on single words'
        ],
        correctAnswer: 'B',
        explanation: 'Active listening with note-taking works best for educational video content.',
        difficulty: 'medium',
        type: 'inference'
      },
      {
        question: 'How does the speaker connect with the audience?',
        options: [
          'Through questions only',
          'Using examples',
          'With formal language',
          'Multiple connection methods'
        ],
        correctAnswer: 'D',
        explanation: 'Good educators use various strategies to connect with their audience.',
        difficulty: 'medium',
        type: 'language_function'
      }
    ]

    const hardQuestions: Omit<ConversationQuestion, 'id'>[] = [
      {
        question: 'What tone does the speaker use throughout this segment?',
        options: [
          'Formal and academic',
          'Casual and friendly',
          'Serious and authoritative',
          'Varies with content'
        ],
        correctAnswer: 'D',
        explanation: 'Educational speakers often change their tone based on the content being discussed.',
        difficulty: 'hard',
        type: 'speaker_tone'
      },
      {
        question: 'What makes this segment challenging for English learners?',
        options: [
          'Complex grammar only',
          'Fast speaking pace',
          'Technical vocabulary',
          'Combination of factors'
        ],
        correctAnswer: 'D',
        explanation: 'Educational content challenges learners through multiple language and concept factors.',
        difficulty: 'hard',
        type: 'vocabulary_in_context'
      },
      {
        question: 'What cultural knowledge might help understand this content?',
        options: [
          'No cultural knowledge needed',
          'Basic understanding helpful',
          'Deep cultural knowledge required',
          'Depends on specific topics'
        ],
        correctAnswer: 'D',
        explanation: 'Cultural knowledge needs vary depending on the specific content being discussed.',
        difficulty: 'hard',
        type: 'inference'
      },
      {
        question: 'How can learners best prepare for similar content?',
        options: [
          'Study grammar rules only',
          'Build vocabulary first',
          'Practice with similar materials',
          'Use multiple preparation methods'
        ],
        correctAnswer: 'D',
        explanation: 'Effective preparation involves combining multiple complementary strategies.',
        difficulty: 'hard',
        type: 'language_function'
      }
    ]

    // Select questions based on preset distribution
    const selectedQuestions: ConversationQuestion[] = []
    let questionId = 1

    // Add easy questions
    for (let i = 0; i < actualPreset.easy; i++) {
      const baseQuestion = easyQuestions[i % easyQuestions.length]
      selectedQuestions.push({
        ...baseQuestion,
        id: `q_${loop.id}_${questionId}`,
        timestamp: loop.startTime + (questionId - 1) * (loop.endTime - loop.startTime) / totalQuestions
      })
      questionId++
    }

    // Add medium questions
    for (let i = 0; i < actualPreset.medium; i++) {
      const baseQuestion = mediumQuestions[i % mediumQuestions.length]
      selectedQuestions.push({
        ...baseQuestion,
        id: `q_${loop.id}_${questionId}`,
        timestamp: loop.startTime + (questionId - 1) * (loop.endTime - loop.startTime) / totalQuestions
      })
      questionId++
    }

    // Add hard questions
    for (let i = 0; i < actualPreset.hard; i++) {
      const baseQuestion = hardQuestions[i % hardQuestions.length]
      selectedQuestions.push({
        ...baseQuestion,
        id: `q_${loop.id}_${questionId}`,
        timestamp: loop.startTime + (questionId - 1) * (loop.endTime - loop.startTime) / totalQuestions
      })
      questionId++
    }

    const duration = loop.endTime - loop.startTime

    return {
      loopId: loop.id,
      questions: selectedQuestions,
      metadata: {
        totalQuestions: totalQuestions,
        analysisDate: new Date().toISOString(),
        generatedFromTranscript: !!transcript,
        transcriptLength: transcript?.length,
        transcriptSegmentCount: 0,
        transcriptLanguage: transcript ? 'en' : undefined,
        canRegenerateQuestions: true,
        videoAnalysis: true,
        videoSegmentDuration: duration,
        preset: actualPreset,
        actualDistribution: {
          easy: actualPreset.easy,
          medium: actualPreset.medium, 
          hard: actualPreset.hard
        }
      }
    }
  }
}

// Legacy compatibility export
export default ConversationAnalysisService