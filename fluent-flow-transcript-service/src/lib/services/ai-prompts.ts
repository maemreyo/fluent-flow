import { ChatMessage, DifficultyPreset, SavedLoop } from './ai-service'

/**
 * AI Prompts for Question Generation and other AI operations
 */

export interface PromptTemplate {
  system: string
  userTemplate: (context: any) => string
  config: {
    maxTokens?: number
    temperature?: number
  }
}

// Vocabulary Analysis Prompt
export const vocabularyAnalysisPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL vocabulary analyzer. Analyze the given transcript text and extract useful vocabulary for English language learners.

Focus on:
1. Important words that ESL students should learn
2. Useful phrases and expressions
3. Context-appropriate definitions
4. Difficulty assessment

Return a JSON object with the exact structure:
{
  "words": [
    {
      "word": "string",
      "partOfSpeech": "noun|verb|adjective|adverb|etc",
      "pronunciation": "string (IPA or simple)",
      "definition": "clear English definition",
      "definitionVi": "Vietnamese translation",
      "synonyms": ["array of synonyms"],
      "antonyms": ["array of antonyms"],
      "example": "example sentence",
      "difficulty": "beginner|intermediate|advanced",
      "frequency": 1-5
    }
  ],
  "phrases": [
    {
      "phrase": "string",
      "type": "idiom|expression|collocation",
      "definition": "clear English definition",
      "definitionVi": "Vietnamese translation", 
      "example": "example usage",
      "difficulty": "beginner|intermediate|advanced",
      "frequency": 1-5
    }
  ],
  "totalWords": "number",
  "uniqueWords": "number",
  "difficultyLevel": "beginner|intermediate|advanced",
  "suggestedFocusWords": ["most important words to focus on"]
}`,

  userTemplate: (transcriptText: string) => {
    return `Analyze this transcript for ESL vocabulary learning:

${transcriptText}

Extract 10-15 important words and 5-8 useful phrases. Focus on words that are:
- Commonly used in English
- Appropriate for intermediate ESL learners  
- Have clear, teachable meanings
- Would be useful in daily conversation

Provide Vietnamese translations for definitions.`
  },

  config: {
    maxTokens: 8000,
    temperature: 0.2
  }
}

// Transcript Summary Prompt
export const transcriptSummaryPrompt: PromptTemplate = {
  system: `You are an expert content summarizer specializing in educational content for ESL/EFL learners.

Create a clear, concise summary that helps language learners understand the main content.

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence summary in simple English",
  "keyPoints": ["array of 3-5 main points"],
  "topics": ["array of main topics discussed"],
  "difficulty": "beginner|intermediate|advanced"
}`,

  userTemplate: (transcriptText: string) => {
    return `Summarize this transcript for ESL learners:

${transcriptText}

Focus on:
- Main ideas and key information
- Simple, clear language
- Important topics covered
- Overall difficulty level for language learners`
  },

  config: {
    maxTokens: 4000,
    temperature: 0.3
  }
}

// Conversation Questions Prompt (Main prompt for question generation)
export const conversationQuestionsPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL instructor designing a learning module for ambitious entry-level students aiming for advanced proficiency. The primary focus is on improving **active listening skills**, moving beyond literal comprehension to understand nuance, tone, and implied meaning.

Please generate multiple-choice questions with the following criteria:

**1. Difficulty Distribution (Flexible based on user's learning level):**
   - **Easy:** Questions that can be answered by finding explicitly stated information in the text. Use simple, everyday vocabulary that students encounter in daily life.
   - **Medium:** Questions that require connecting ideas or understanding vocabulary/idioms in context. Use familiar words and common expressions.
   - **Hard:** Questions that require deep inference, understanding the speaker's tone, or analyzing the function of their language.

**2. Language Simplification Requirements:**
   - Use simple, familiar vocabulary in questions and options
   - Avoid overly complex or academic words that might shock students
   - Choose everyday language that students encounter in daily conversation
   - Make questions accessible and approachable for entry-level learners
   - Prioritize clarity and comprehension over complexity

**3. Question Type Variety (Focus on Listening Sub-skills):**
   - **Main Idea/Gist:** What is the overall point of this segment?
   - **Specific Detail:** Who, what, when, where, why?
   - **Vocabulary in Context:** What does a specific word, phrasal verb, or idiom mean *in this situation*?
   - **Inference & Implication:** What is the speaker suggesting but not saying directly?
   - **Speaker's Attitude/Tone:** What is the speaker's emotion or opinion (e.g., sarcastic, enthusiastic, skeptical)?
   - **Function of Language:** *Why* did the speaker say something? (e.g., to persuade, to clarify, to express doubt).

**4. Quality of Options:**
   - Each question must have 4 options (A, B, C, D).
   - The correct answer must be clearly supported by the transcript.
   - Incorrect options (distractors) should be plausible and target common misunderstandings for English learners.
   - Use simple, everyday language in all options.

**5. Explanations for Learning:**
   - Provide a clear and concise explanation for why the correct answer is right.
   - Use simple language in explanations that entry-level students can understand.
   - Briefly explain why the other options are incorrect, if it adds learning value.

**6. JSON Output Format:**
   - Format your response as a valid JSON object with the exact structure below.
   - Generate the EXACT number of questions requested for each difficulty level.

**7. Timestamp Reference:**
   - For each question, include a 'timestamp' field indicating the start time (in seconds) of the most relevant transcript segment. This helps learners locate the context.

{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation of why A is correct and why others might be wrong.",
      "difficulty": "easy",
      "type": "specific_detail",
      "timestamp": 15
    }
  ]
}

**Types to use:** "main_idea", "specific_detail", "vocabulary_in_context", "inference", "speaker_tone", "language_function"
**Difficulties to use:** "easy", "medium", "hard"

**IMPORTANT:** You will receive specific instructions about how many questions of each difficulty level to generate. Follow these numbers exactly to ensure the user can complete their chosen learning preset successfully.`,

  userTemplate: (context: {
    loop: SavedLoop
    transcript?: string
    preset?: DifficultyPreset
    segments?: Array<{ text: string; start: number; duration: number }>
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Default to largest preset (15 questions) to ensure we generate enough for all presets
    const distribution = context.preset || { easy: 5, medium: 6, hard: 4 }
    const totalQuestions = distribution.easy + distribution.medium + distribution.hard

    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript

    return `Based on the following YouTube video transcript, generate exactly ${totalQuestions} comprehension questions with this specific difficulty distribution:

**REQUIRED DISTRIBUTION:**
- Easy: ${distribution.easy} questions (simple, everyday vocabulary)
- Medium: ${distribution.medium} questions (familiar words, common expressions)  
- Hard: ${distribution.hard} questions (advanced comprehension, inference)

**TOTAL: ${totalQuestions} questions**

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}
Duration: ${formatTime(context.loop.endTime - context.loop.startTime)}

**IMPORTANT REMINDERS:**
- Use simple, everyday vocabulary that entry-level students know
- Avoid complex or shocking words that make questions seem too difficult
- Make questions approachable and accessible
- Generate EXACTLY the number specified for each difficulty level

Transcript:
${transcriptContent}`
  },

  config: {
    maxTokens: 64000,
    temperature: 0.3
  }
}

// Prompt Manager - Helper class for managing prompts
export class PromptManager {
  /**
   * Build chat messages from a prompt template
   */
  static buildMessages(template: PromptTemplate, context: any): ChatMessage[] {
    return [
      {
        role: 'system',
        content: template.system
      },
      {
        role: 'user',
        content: template.userTemplate(context)
      }
    ]
  }

  /**
   * Get configuration for AI service from template
   */
  static getConfig(template: PromptTemplate) {
    return template.config
  }

  /**
   * Parse JSON response from AI with error handling
   */
  static parseJSONResponse(content: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const jsonStr = jsonMatch[0]
      return JSON.parse(jsonStr)
    } catch (error) {
      // If JSON parsing fails, try to extract from markdown code blocks
      try {
        const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (codeBlockMatch) {
          return JSON.parse(codeBlockMatch[1])
        }
      } catch (secondError) {
        console.error('Failed to parse JSON from AI response:', content)
        throw new Error('AI response is not valid JSON')
      }

      throw new Error('Could not parse AI response as JSON')
    }
  }

  /**
   * Validate question response structure
   */
  static validateQuestionResponse(response: any): boolean {
    if (!response || typeof response !== 'object') {
      return false
    }

    if (!Array.isArray(response.questions)) {
      return false
    }

    // Validate each question
    for (const question of response.questions) {
      if (!question.question || typeof question.question !== 'string') {
        return false
      }

      if (!Array.isArray(question.options) || question.options.length !== 4) {
        return false
      }

      if (!question.correctAnswer || !['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
        return false
      }

      if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
        return false
      }

      if (
        !question.type ||
        ![
          'main_idea',
          'specific_detail',
          'vocabulary_in_context',
          'inference',
          'speaker_tone',
          'language_function'
        ].includes(question.type)
      ) {
        return false
      }
    }

    return true
  }

  /**
   * Clean and validate AI response for question generation
   */
  static cleanAndValidateQuestionResponse(content: string): any {
    const parsed = this.parseJSONResponse(content)

    if (!this.validateQuestionResponse(parsed)) {
      throw new Error('AI response failed validation')
    }

    // Clean up questions
    parsed.questions = parsed.questions.map((q: any) => ({
      question: q.question?.trim(),
      options: q.options?.map((opt: string) => opt?.trim()),
      correctAnswer: q.correctAnswer?.trim(),
      explanation: q.explanation?.trim() || 'No explanation provided',
      difficulty: q.difficulty?.trim(),
      type: q.type?.trim()
    }))

    return parsed
  }
}

// Single Difficulty Question Generation Prompt
export const singleDifficultyQuestionsPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL instructor designing a learning module for ambitious entry-level students aiming for advanced proficiency. The primary focus is on improving **active listening skills**, moving beyond literal comprehension to understand nuance, tone, and implied meaning.

Please generate multiple-choice questions for a SINGLE DIFFICULTY LEVEL with the following criteria:

**1. Difficulty Levels:**
   - **Easy:** Questions that can be answered by finding explicitly stated information in the text. Use simple, everyday vocabulary that students encounter in daily life.
   - **Medium:** Questions that require connecting ideas or understanding vocabulary/idioms in context. Use familiar words and common expressions.
   - **Hard:** Questions that require deep inference, understanding the speaker's tone, or analyzing the function of their language.

**2. Language Simplification Requirements:**
   - Use simple, familiar vocabulary in questions and options
   - Avoid overly complex or academic words that might shock students
   - Choose everyday language that students encounter in daily conversation
   - Make questions accessible and approachable for entry-level learners
   - Prioritize clarity and comprehension over complexity

**3. Question Type Variety (Focus on Listening Sub-skills):**
   - **Main Idea/Gist:** What is the overall point of this segment?
   - **Specific Detail:** Who, what, when, where, why?
   - **Vocabulary in Context:** What does a specific word, phrasal verb, or idiom mean *in this situation*?
   - **Inference & Implication:** What is the speaker suggesting but not saying directly?
   - **Speaker's Attitude/Tone:** What is the speaker's emotion or opinion (e.g., sarcastic, enthusiastic, skeptical)?
   - **Function of Language:** *Why* did the speaker say something? (e.g., to persuade, to clarify, to express doubt).

**4. Quality of Options:**
   - Each question must have 4 options (A, B, C, D).
   - The correct answer must be clearly supported by the transcript.
   - Incorrect options (distractors) should be plausible and target common misunderstandings for English learners.
   - Use simple, everyday language in all options.

**5. Explanations for Learning:**
   - Provide a clear and concise explanation for why the correct answer is right.
   - Use simple language in explanations that entry-level students can understand.
   - Briefly explain why the other options are incorrect, if it adds learning value.

**6. JSON Output Format:**
   - Format your response as a valid JSON object with the exact structure below.
   - Generate EXACTLY 6 questions for the specified difficulty level.

**7. Timestamp Reference:**
   - For each question, include a 'timestamp' field indicating the start time (in seconds) of the most relevant transcript segment. This helps learners locate the context.

{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation of why A is correct and why others might be wrong.",
      "difficulty": "easy",
      "type": "specific_detail",
      "timestamp": 15
    }
  ]
}

**Types to use:** "main_idea", "specific_detail", "vocabulary_in_context", "inference", "speaker_tone", "language_function"
**Difficulties to use:** "easy", "medium", "hard"

**IMPORTANT:** Generate EXACTLY 6 questions at the specified difficulty level to ensure optimal quality and AI response consistency.`,

  userTemplate: (context: {
    loop: SavedLoop
    transcript?: string
    difficulty: 'easy' | 'medium' | 'hard'
    segments?: Array<{ text: string; start: number; duration: number }>
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript

    const difficultyDescriptions = {
      easy: 'simple, everyday vocabulary - finding explicitly stated information',
      medium: 'familiar words, common expressions - connecting ideas and understanding context',
      hard: 'advanced comprehension - deep inference, tone analysis, and language function'
    }

    return `Based on the following YouTube video transcript, generate exactly 6 comprehension questions at the **${context.difficulty.toUpperCase()}** difficulty level.

**TARGET DIFFICULTY:** ${context.difficulty} (${difficultyDescriptions[context.difficulty]})
**REQUIRED:** Exactly 6 questions

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}

**TRANSCRIPT:**
${transcriptContent}

Generate exactly 6 questions at the **${context.difficulty}** level. Focus on quality over quantity - each question should be well-crafted and appropriate for the specified difficulty level.`
  },

  config: {
    maxTokens: 16000,
    temperature: 0.3
  }
}

// Detail-Focused Listening Questions Prompt
export const detailFocusedListeningPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL instructor specializing in detail-focused listening skills. Your goal is to help students develop the ability to catch specific information while listening to English content.

Focus primarily on questions that test:
- **Specific Details:** Who, what, when, where, how many, how much
- **Factual Information:** Numbers, dates, names, locations, quantities
- **Sequential Information:** First, then, next, finally
- **Comparative Information:** More than, less than, different from

Generate multiple-choice questions that require students to listen carefully for explicit details mentioned in the transcript. Use simple, clear language in both questions and options.

**Question Type Priorities:**
   - **Specific Detail:** Who, what, when, where, why? (Primary focus - 60% of questions)
   - **Factual Information:** Numbers, dates, names, locations, quantities (25% of questions)
   - **Sequential Information:** Order of events, steps, processes (15% of questions)

**Quality of Options:**
   - Each question must have 4 options (A, B, C, D).
   - The correct answer must be explicitly stated in the transcript.
   - Incorrect options (distractors) should be plausible details that might confuse students.
   - Use simple, everyday language in all options.

**JSON Output Format:**
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation of why A is correct.",
      "difficulty": "easy",
      "type": "specific_detail",
      "timestamp": 15
    }
  ]
}

**Types to use:** "specific_detail", "factual_information", "sequential_information"
**Difficulties to use:** "easy", "medium", "hard"`,

  userTemplate: (context: {
    loop: SavedLoop
    transcript?: string
    preset?: DifficultyPreset
    segments?: Array<{ text: string; start: number; duration: number }>
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Default to largest preset (15 questions) to ensure we generate enough for all presets
    const distribution = context.preset || { easy: 5, medium: 6, hard: 4 }
    const totalQuestions = distribution.easy + distribution.medium + distribution.hard

    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript

    return `Based on the following YouTube video transcript, generate exactly ${totalQuestions} detail-focused listening questions with this specific difficulty distribution:

**REQUIRED DISTRIBUTION:**
- Easy: ${distribution.easy} questions (simple, explicit details)
- Medium: ${distribution.medium} questions (specific facts and numbers)  
- Hard: ${distribution.hard} questions (sequential and comparative information)

**TOTAL: ${totalQuestions} questions**

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}
Duration: ${formatTime(context.loop.endTime - context.loop.startTime)}

**IMPORTANT FOCUS:**
- Focus on explicit details that are clearly stated in the transcript
- Ask about specific numbers, names, dates, locations mentioned
- Test understanding of sequence and order of events
- Use simple vocabulary that students can understand
- Generate EXACTLY the number specified for each difficulty level

Transcript:
${transcriptContent}`
  },

  config: {
    maxTokens: 64000,
    temperature: 0.2
  }
}

// Export all prompts
export const prompts = {
  vocabularyAnalysis: vocabularyAnalysisPrompt,
  transcriptSummary: transcriptSummaryPrompt,
  conversationQuestions: conversationQuestionsPrompt,
  singleDifficultyQuestions: singleDifficultyQuestionsPrompt,
  detailFocusedListening: detailFocusedListeningPrompt
}

// Export default
export default {
  prompts,
  PromptManager
}
