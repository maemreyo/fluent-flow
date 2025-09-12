;
// AI Prompt Templates and Management
// Centralized prompts to keep AIService clean and maintainable

import type { SavedLoop } from '../types/fluent-flow-types';


export interface PromptTemplate {
  system: string
  userTemplate: (context: any) => string
  config?: {
    maxTokens?: number
    temperature?: number
  }
}

/**
 * Vocabulary Analysis Prompt
 */
export const vocabularyAnalysisPrompt: PromptTemplate = {
  system: `You are an expert English vocabulary analyst for language learners. Analyze the following transcript and extract the most important vocabulary words and phrases.

Generate a comprehensive vocabulary analysis. Return ONLY a valid JSON object with this exact structure:

{
  "words": [
    {
      "word": "example",
      "partOfSpeech": "noun",
      "pronunciation": "/ɪɡˈzæmpəl/",
      "definition": "Clear English definition",
      "definitionVi": "Vietnamese translation",
      "synonyms": ["sample", "instance"],
      "antonyms": ["opposite1"],
      "example": "Natural example sentence",
      "difficulty": "intermediate",
      "frequency": 3
    }
  ],
  "phrases": [
    {
      "phrase": "example phrase",
      "type": "collocation",
      "definition": "Clear English definition",
      "definitionVi": "Vietnamese translation", 
      "example": "Natural example sentence",
      "difficulty": "intermediate",
      "frequency": 2
    }
  ],
  "totalWords": 150,
  "uniqueWords": 95,
  "difficultyLevel": "intermediate",
  "suggestedFocusWords": ["word1", "word2", "word3"]
}

Requirements:
- Extract 8-12 most important words that are useful for learning
- Include 3-5 key phrases, collocations, or idioms
- Provide accurate pronunciation using IPA notation
- Give clear, concise definitions in English
- Provide Vietnamese translations for definitions
- Include 2-3 synonyms and 1-2 antonyms where applicable
- Create natural example sentences showing usage
- Assess difficulty: "beginner", "intermediate", or "advanced"
- Count frequency based on appearance in transcript
- Suggest 5 focus words for priority learning
- Assess overall difficulty level of the content

Types for phrases: "idiom", "collocation", "expression"`,
  
  userTemplate: (transcriptText: string) => `Transcript:\n${transcriptText}`,
  
  config: {
    maxTokens: 16000,
    temperature: 0.3
  }
}

/**
 * Transcript Summary Prompt
 */
export const transcriptSummaryPrompt: PromptTemplate = {
  system: `You are an expert content summarizer for English language learners. Analyze the following transcript and create a comprehensive summary.

Generate a detailed summary for language learners. Return ONLY a valid JSON object with this exact structure:

{
  "summary": "A clear 2-3 sentence summary capturing the main content and purpose",
  "keyPoints": [
    "First key point discussed",
    "Second key point discussed", 
    "Third key point discussed"
  ],
  "topics": [
    "main topic 1",
    "main topic 2",
    "main topic 3"
  ],
  "difficulty": "intermediate"
}

Requirements:
- Summary: 2-3 sentences capturing the essence and main message
- Key Points: 3-5 most important points or takeaways
- Topics: 3-5 main subjects or themes covered
- Difficulty: Assess as "beginner", "intermediate", or "advanced" based on:
  * Vocabulary complexity
  * Sentence structure
  * Concept difficulty
  * Speaking pace and clarity
  * Cultural/contextual knowledge required

Focus on what would be most helpful for English language learners to understand.`,
  
  userTemplate: (transcriptText: string) => `Transcript:\n${transcriptText}`,
  
  config: {
    maxTokens: 800,
    temperature: 0.3
  }
}

/**
 * Conversation Questions Generation Prompt
 */
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

**IMPORTANT:** You will receive specific instructions about how many questions of each difficulty level to generate. Follow these numbers exactly to ensure the user can complete their chosen learning preset successfully.`,

  userTemplate: (context: {
    loop: SavedLoop
    transcript: string
    preset?: { easy: number; medium: number; hard: number }
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Default to largest preset (15 questions) to ensure we generate enough for all presets
    const distribution = context.preset || { easy: 5, medium: 6, hard: 4 }
    const totalQuestions = distribution.easy + distribution.medium + distribution.hard

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
${context.transcript}`
  },

  config: {
    maxTokens: 64000,
    temperature: 0.3
  }
}

/**
 * Prompt execution helper
 */
export class PromptManager {
  /**
   * Execute a prompt template with context
   */
  static buildMessages(
    template: PromptTemplate,
    context: any
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
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
   * Get prompt configuration
   */
  static getConfig(template: PromptTemplate): { maxTokens?: number; temperature?: number } {
    return template.config || { maxTokens: 1000, temperature: 0.7 }
  }

  /**
   * Parse JSON response with error handling
   */
  static parseJSONResponse(responseText: string): any {
    // Try to find the JSON object in the response
    // Look for the first opening brace and find the matching closing brace
    const firstBrace = responseText.indexOf('{')
    if (firstBrace === -1) {
      throw new Error('No JSON found in AI response')
    }

    let braceCount = 0
    let jsonEndIndex = -1

    for (let i = firstBrace; i < responseText.length; i++) {
      if (responseText[i] === '{') {
        braceCount++
      } else if (responseText[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          jsonEndIndex = i
          break
        }
      }
    }

    if (jsonEndIndex === -1) {
      throw new Error('Malformed JSON in AI response - no matching closing brace')
    }

    const jsonString = responseText.substring(firstBrace, jsonEndIndex + 1)

    try {
      return JSON.parse(jsonString)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Attempted to parse:', jsonString)
      throw new Error(`Invalid JSON in AI response: ${parseError.message}`)
    }
  }
}

// Export all prompts for easy access
const detailFocusedListeningPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL instructor specializing in **detail-focused listening skills** for ambitious entry-level students aiming for advanced proficiency. Your primary goal is to help students develop precision in catching specific information, factual details, and sequential elements in spoken English.

Please generate multiple-choice questions with the following criteria:

**1. Difficulty Distribution (Flexible based on user's learning level):**
   - **Easy:** Questions focusing on explicit, clearly stated specific details (numbers, names, places, times). Use simple, everyday vocabulary.
   - **Medium:** Questions requiring attention to factual information, sequences, or cause-and-effect relationships. Use familiar words and common expressions.
   - **Hard:** Questions demanding precise listening for subtle details, complex sequences, or nuanced factual distinctions.

**2. Detail-Focused Question Types:**
   - **Specific Facts:** Numbers, dates, names, places, quantities, measurements
   - **Sequential Information:** Order of events, steps in processes, chronological details
   - **Factual Accuracy:** Distinguishing between similar but different pieces of information
   - **Precise Details:** Exact words used, specific conditions mentioned, particular exceptions noted
   - **Supporting Details:** Evidence, examples, or specifics that support main points

**3. Language Simplification Requirements:**
   - Use simple, familiar vocabulary in questions and options
   - Avoid complex academic words that might overwhelm entry-level students
   - Choose everyday language that students encounter in daily conversation
   - Make questions accessible while maintaining focus on detailed listening
   - Prioritize clarity in asking about specific details

**4. Quality of Options:**
   - Each question must have 4 options (A, B, C, D)
   - The correct answer must be precisely stated in the transcript
   - Incorrect options should be plausible details that might confuse careful listeners
   - Include near-misses (similar numbers, dates, or facts) as distractors
   - Use simple, everyday language in all options

**5. Explanations for Learning:**
   - Point to the exact part of the transcript that contains the correct detail
   - Use simple language that entry-level students can understand
   - Explain why precision in listening for details is important
   - Briefly note why other options might seem correct but are not

**6. JSON Output Format:**
   - Format your response as a valid JSON object with the exact structure below
   - Generate the EXACT number of questions requested for each difficulty level

{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation pointing to exact detail in transcript and why precision matters.",
      "difficulty": "easy",
      "type": "specific_facts"
    }
  ]
}

**Types to use:** "specific_facts", "sequential_information", "factual_accuracy", "precise_details", "supporting_details"
**Difficulties to use:** "easy", "medium", "hard"

**IMPORTANT:** You will receive specific instructions about how many questions of each difficulty level to generate. Follow these numbers exactly to ensure detailed listening practice matches the chosen learning preset.`,

  userTemplate: (context: {
    loop: SavedLoop
    transcript: string
    preset?: { easy: number; medium: number; hard: number }
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Default to largest preset (15 questions) to ensure we generate enough for all presets
    const distribution = context.preset || { easy: 5, medium: 6, hard: 4 }
    const totalQuestions = distribution.easy + distribution.medium + distribution.hard

    return `Based on the following YouTube video transcript, generate exactly ${totalQuestions} detail-focused listening questions with this specific difficulty distribution:

**REQUIRED DISTRIBUTION:**
- Easy: ${distribution.easy} questions (explicit specific details - numbers, names, places)
- Medium: ${distribution.medium} questions (factual information, sequences, relationships)  
- Hard: ${distribution.hard} questions (precise details, subtle distinctions, complex sequences)

**TOTAL: ${totalQuestions} questions**

**FOCUS:** Train students to listen precisely for specific factual information, sequential details, and exact elements mentioned in the audio.

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}
Duration: ${formatTime(context.loop.endTime - context.loop.startTime)}

**IMPORTANT REMINDERS:**
- Focus on details that require precise listening (numbers, names, exact words, sequences)
- Use simple vocabulary in questions while testing detailed comprehension
- Make questions accessible but demanding in terms of listening precision
- Generate EXACTLY the number specified for each difficulty level

Transcript:
${context.transcript}`
  },

  config: {
    maxTokens: 64000,
    temperature: 0.3
  }
}
export const prompts = {
  vocabularyAnalysis: vocabularyAnalysisPrompt,
  transcriptSummary: transcriptSummaryPrompt,
  conversationQuestions: conversationQuestionsPrompt,
  detailFocusedListening: detailFocusedListeningPrompt
} as const