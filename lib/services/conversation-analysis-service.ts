import { GoogleGenerativeAI } from '@google/generative-ai'
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
  constructor(private geminiConfig: { apiKey: string }) {}

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
    // Validate inputs
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content provided')
    }

    if (!this.geminiConfig?.apiKey) {
      console.warn('Gemini API not configured, using fallback questions')
      return this.generateFallbackQuestions(loop, transcript)
    }

    try {
      const genAI = new GoogleGenerativeAI(this.geminiConfig.apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `
Based on the following YouTube video transcript, generate 5 comprehension questions that would help someone learning English improve their understanding. The transcript is from a video segment from ${this.formatTime(loop.startTime)} to ${this.formatTime(loop.endTime)}.

Video Title: ${loop.videoTitle || 'YouTube Video'}
Duration: ${this.formatTime(loop.endTime - loop.startTime)}

Transcript:
${transcript}

Please generate exactly 5 multiple choice questions with the following criteria:
1. Mix of difficulty levels (2 easy, 2 medium, 1 hard)
2. Different question types: main idea, details, vocabulary, inference, grammar
3. Each question should have 4 options (A, B, C, D)
4. Include explanations for the correct answers
5. Questions should focus on language learning and comprehension

Format your response as JSON with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation of why A is correct",
      "difficulty": "easy",
      "type": "main_idea"
    }
  ]
}

Types to use: "main_idea", "detail", "vocabulary", "inference", "grammar"
Difficulties to use: "easy", "medium", "hard"
`

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      // Parse the AI response
      let aiResponse: { questions: any[] }
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response')
        }
        aiResponse = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError, 'Response:', responseText)
        throw new Error('Invalid response format from AI service')
      }

      // Validate and format questions
      if (!aiResponse.questions || !Array.isArray(aiResponse.questions)) {
        throw new Error('AI response missing questions array')
      }

      const questions: ConversationQuestion[] = aiResponse.questions
        .slice(0, 5)
        .map((q: any, index: number) => {
          // Validate question structure
          if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(`Invalid question structure at index ${index}`)
          }

          return {
            id: `q_${loop.id}_ai_${index + 1}`,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer || 'A',
            explanation: q.explanation || 'No explanation provided',
            difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
            type: ['main_idea', 'detail', 'vocabulary', 'inference', 'grammar'].includes(q.type)
              ? q.type
              : 'main_idea',
            timestamp: loop.startTime + (index * (loop.endTime - loop.startTime)) / 5
          }
        })

      // Ensure we have exactly 5 questions
      while (questions.length < 5) {
        const fallbackQuestions = this.generateFallbackQuestions(loop, transcript)
        questions.push(...fallbackQuestions.questions.slice(questions.length, 5))
      }

      const duration = loop.endTime - loop.startTime

      return {
        loopId: loop.id,
        questions: questions.slice(0, 5),
        metadata: {
          totalQuestions: 5,
          analysisDate: new Date().toISOString(),
          generatedFromAudio: false,
          generatedFromTranscript: true,
          transcriptLength: transcript.length,
          videoSegmentDuration: duration,
          canRegenerateQuestions: true,
          videoAnalysis: true,
          audioAnalysis: false
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
   * Format seconds to MM:SS format
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
        type: 'vocabulary'
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
        type: 'grammar'
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
        type: 'detail'
      }
    ]

    // Generate 5 questions with unique IDs
    const questions: ConversationQuestion[] = baseQuestions.slice(0, 5).map((q, index) => ({
      ...q,
      id: `q_${loop.id}_${index + 1}`,
      timestamp: loop.startTime + (index * (loop.endTime - loop.startTime)) / 5
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
