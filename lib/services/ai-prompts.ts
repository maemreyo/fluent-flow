// AI Prompt Templates and Management
// Centralized prompts to keep AIService clean and maintainable

import type { SavedLoop } from '../types/fluent-flow-types'

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
- Extract 15-20 most important words that are useful for learning
- Include 5-10 key phrases, collocations, or idioms
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
    maxTokens: 2000,
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
  system: `You are an expert ESL/EFL instructor designing a learning module for a group of ambitious entry-level students aiming for advanced proficiency in 3 months. The primary focus is on improving **active listening skills**, moving beyond literal comprehension to understand nuance, tone, and implied meaning.

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
**Difficulties to use:** "easy", "medium", "hard"`,

  userTemplate: (context: { loop: SavedLoop; transcript: string }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return `Based on the following YouTube video transcript, generate 15 comprehension questions. The transcript is from a video segment from ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}.

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Duration: ${formatTime(context.loop.endTime - context.loop.startTime)}

Transcript:
${context.transcript}`
  },
  
  config: {
    maxTokens: 3000,
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
  static buildMessages(template: PromptTemplate, context: any): Array<{role: 'system' | 'user' | 'assistant', content: string}> {
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
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }
    return JSON.parse(jsonMatch[0])
  }
}

// Export all prompts for easy access
export const prompts = {
  vocabularyAnalysis: vocabularyAnalysisPrompt,
  transcriptSummary: transcriptSummaryPrompt,
  conversationQuestions: conversationQuestionsPrompt
} as const