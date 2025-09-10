// ❌ DEPRECATED: Old conversation analysis service
// TODO: Remove this file - replaced by conversation-analysis-service.ts
// This file contains old Gemini-based implementation that is no longer used

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
   * Generate questions from a loop (main method expected by integration service)
   */
  async generateQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
    // Always use transcript-based generation now
    return this.generateFallbackQuestions(loop)
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

      const prompt = `
You are an expert ESL/EFL instructor designing a learning module for a group of ambitious entry-level students aiming for advanced proficiency in 3 months. The primary focus is on improving **active listening skills**, moving beyond literal comprehension to understand nuance, tone, and implied meaning.

Based on the following YouTube video transcript, generate 15 comprehension questions. The transcript is from a video segment from ${this.formatTime(loop.startTime)} to ${this.formatTime(loop.endTime)}.

Video Title: ${loop.videoTitle || 'YouTube Video'}
Duration: ${this.formatTime(loop.endTime - loop.startTime)}

Transcript:
${transcript}

Please generate exactly 15 multiple-choice questions with the following criteria:

**1. Difficulty Distribution (Builds a learning curve):**
   - **4 Easy:** Questions that can be answered by finding explicitly stated information in the text.
   - **7 Medium:** Questions that require connecting ideas or understanding vocabulary/idioms in context.
   - **4 Hard:** Questions that require deep inference, understanding the speaker's tone, or analyzing the function of their language.

**2. Question Type Variety (Focus on Listening Sub-skills):**
   - **Main Idea/Gist:** What is the overall point of this segment?
   - **Specific Detail:** Who, what, when, where, why?
   - **Vocabulary in Context:** What does a specific word, phrasal verb, or idiom mean *in this situation*?
   - **Inference & Implication:** What is the speaker suggesting but not saying directly?
   - **Speaker's Attitude/Tone:** What is the speaker's emotion or opinion (e.g., sarcastic, enthusiastic, skeptical)? This requires listening to *how* things are said.
   - **Function of Language:** *Why* did the speaker say something? (e.g., to persuade, to clarify, to soften a statement, to express doubt).

**3. Quality of Options:**
   - Each question must have 4 options (A, B, C, D).
   - The correct answer must be clearly supported by the transcript.
   - Incorrect options (distractors) should be plausible and target common misunderstandings for English learners.

**4. Explanations for Learning:**
   - Provide a clear and concise explanation for why the correct answer is right.
   - Briefly explain why the other options are incorrect, if it adds learning value.

**5. JSON Output Format:**
   - Format your response as a valid JSON object with the exact structure below.

{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation of why A is correct and why others might be wrong.",
      "difficulty": "easy",
      "type": "specific_detail"
    }
  ]
}

**Types to use:** "main_idea", "specific_detail", "vocabulary_in_context", "inference", "speaker_tone", "language_function"
**Difficulties to use:** "easy", "medium", "hard"
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
        .slice(0, 15)
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
            type: ['main_idea', 'specific_detail', 'vocabulary_in_context', 'inference', 'speaker_tone', 'language_function'].includes(q.type)
              ? q.type
              : 'main_idea',
            timestamp: loop.startTime + (index * (loop.endTime - loop.startTime)) / 15
          }
        })

      // Ensure we have exactly 15 questions
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
   * Format seconds to MM:SS format
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

export default ConversationAnalysisService
