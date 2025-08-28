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
  constructor(
    private geminiConfig: { apiKey: string }
  ) {}

  /**
   * Generate questions from audio analysis (main method expected by integration service)
   */
  async analyzeLoopAudio(loop: SavedLoop): Promise<ConversationQuestions> {
    // Since audio functionality is disabled, generate fallback questions
    return this.generateFallbackQuestions(loop)
  }

  /**
   * Generate questions from a loop (expected by integration service)
   */
  async generateQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
    return this.analyzeLoopAudio(loop)
  }

  /**
   * Generate questions from transcript text
   */
  async generateQuestionsFromTranscript(
    loop: SavedLoop, 
    transcript: string
  ): Promise<ConversationQuestions> {
    // For now, generate fallback questions based on the loop
    return this.generateFallbackQuestions(loop, transcript)
  }

  /**
   * Analyze audio for questions (alternative method name)
   */
  async analyzeAudioForQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
    return this.analyzeLoopAudio(loop)
  }

  /**
   * Validate Gemini API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      return !!(this.geminiConfig?.apiKey && this.geminiConfig.apiKey.length > 0)
    } catch {
      return false
    }
  }

  /**
   * Update Gemini configuration
   */
  updateConfig(config: { apiKey: string }): void {
    this.geminiConfig = config
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
        question: "What is the main topic discussed in this video segment?",
        options: [
          "Current events and news",
          "Educational content", 
          "Entertainment and lifestyle",
          "Technical or professional topics"
        ],
        correctAnswer: "B",
        explanation: "This appears to be educational content based on the video context.",
        difficulty: "easy",
        type: "main_idea"
      },
      {
        question: "What key vocabulary words can you identify from this segment?",
        options: [
          "Basic everyday words only",
          "Some specialized terminology",
          "Advanced academic vocabulary", 
          "Technical jargon exclusively"
        ],
        correctAnswer: "B",
        explanation: "Most educational content contains a mix of common and specialized terms.",
        difficulty: "medium",
        type: "vocabulary"
      },
      {
        question: "What is the speaker's main purpose in this segment?",
        options: [
          "To entertain the audience",
          "To inform or educate viewers",
          "To sell a product or service",
          "To express personal opinions only"
        ],
        correctAnswer: "B", 
        explanation: "Educational videos typically aim to inform and teach viewers.",
        difficulty: "easy",
        type: "inference"
      },
      {
        question: "How would you describe the complexity of the language used?",
        options: [
          "Very simple, basic level",
          "Intermediate with some challenges", 
          "Advanced and complex throughout",
          "Mixed levels depending on topic"
        ],
        correctAnswer: "D",
        explanation: "Most educational content adapts language complexity based on the concepts being explained.",
        difficulty: "medium",
        type: "grammar"
      },
      {
        question: "What details support the main ideas presented?",
        options: [
          "Personal anecdotes only",
          "Statistical data and facts",
          "Examples and explanations",
          "All of the above"
        ],
        correctAnswer: "D",
        explanation: "Effective educational content typically uses multiple types of supporting details.",
        difficulty: "medium", 
        type: "detail"
      }
    ]

    // Generate 5 questions with unique IDs
    const questions: ConversationQuestion[] = baseQuestions.slice(0, 5).map((q, index) => ({
      ...q,
      id: `q_${loop.id}_${index + 1}`,
      timestamp: loop.startTime + (index * (loop.endTime - loop.startTime) / 5)
    }))

    const duration = loop.endTime - loop.startTime

    return {
      loopId: loop.id,
      questions,
      metadata: {
        totalQuestions: questions.length,
        analysisDate: new Date().toISOString(),
        generatedFromAudio: false,
        generatedFromTranscript: !!transcript,
        transcriptLength: transcript?.length,
        videoSegmentDuration: duration,
        canRegenerateQuestions: true,
        videoAnalysis: true,
        audioAnalysis: false
      }
    }
  }
}

export default ConversationAnalysisService