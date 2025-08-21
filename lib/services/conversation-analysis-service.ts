import type {
  ConversationQuestion,
  ConversationQuestions,
  SavedLoop
} from '../types/fluent-flow-types'
import { AudioCaptureService } from './audio-capture-service'

export interface GeminiConfig {
  apiKey: string
  baseURL?: string
  model?: string
}

export interface GeminiResponse {
  questions: ConversationQuestion[]
  metadata: {
    totalQuestions: number
    audioLength: number
    analysisDate: string
  }
}

export class ConversationAnalysisService {
  private config: GeminiConfig
  private audioCaptureService: AudioCaptureService

  constructor(config: GeminiConfig) {
    this.config = config
    this.audioCaptureService = new AudioCaptureService()

    if (!config.apiKey) {
      throw new Error('Gemini API key is required')
    }
  }

  /**
   * Generates comprehension questions from loop audio
   */
  async generateQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
    // Input validation
    if (!loop) {
      throw new Error('Loop is required')
    }

    if (!loop.id || typeof loop.id !== 'string') {
      throw new Error('Valid loop ID is required')
    }

    if (!loop.hasAudioSegment || !loop.audioSegmentBlob) {
      throw new Error('No audio segment available for analysis')
    }

    if (typeof loop.audioSegmentBlob !== 'string') {
      throw new Error('Invalid audio data format')
    }

    try {
      // Convert base64 to blob
      const audioBlob = this.audioCaptureService.base64ToBlob(loop.audioSegmentBlob)

      // Additional validation
      if (audioBlob.size === 0) {
        throw new Error('Audio file is empty')
      }

      // Upload audio to Gemini
      const audioFile = await this.uploadAudioToGemini(audioBlob)

      // Generate questions
      const prompt = this.buildQuestionPrompt(loop)
      const response = await this.callGeminiAPI(prompt, audioFile)

      // Parse and validate response
      const questions = this.parseQuestionsResponse(response, loop)

      return {
        loopId: loop.id,
        questions: questions.questions,
        metadata: {
          ...questions.metadata,
          generatedFromAudio: true,
          originalAudioSize: loop.audioSize,
          canRegenerateQuestions: true
        }
      }
    } catch (error) {
      console.error('Question generation failed:', error)
      throw new Error(
        `Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate questions from transcript text instead of audio
   */
  async generateQuestionsFromTranscript(loop: any): Promise<ConversationQuestions> {
    // Input validation
    if (!loop) {
      throw new Error('Loop is required')
    }

    if (!loop.id || typeof loop.id !== 'string') {
      throw new Error('Valid loop ID is required')
    }

    if (!loop.transcriptText || typeof loop.transcriptText !== 'string') {
      throw new Error('No transcript text available for analysis')
    }

    if (loop.transcriptText.trim().length < 10) {
      throw new Error('Transcript text is too short to generate meaningful questions')
    }

    try {
      // Build transcript-specific prompt
      const prompt = this.buildTranscriptQuestionPrompt(loop)
      
      // Call Gemini API with text-only prompt (no audio file)
      const response = await this.callGeminiAPI(prompt)

      // Parse and validate response
      const questions = this.parseQuestionsResponse(response, loop)

      return {
        loopId: loop.id,
        questions: questions.questions,
        metadata: {
          ...questions.metadata,
          generatedFromTranscript: true,
          transcriptLength: loop.transcriptText.length,
          transcriptSegmentCount: loop.transcriptSegments?.length || 0,
          transcriptLanguage: loop.transcriptLanguage || 'en',
          canRegenerateQuestions: true
        }
      }
    } catch (error) {
      console.error('Transcript-based question generation failed:', error)
      throw new Error(
        `Failed to generate questions from transcript: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Uploads audio blob to Gemini Files API
   */
  private async uploadAudioToGemini(audioBlob: Blob): Promise<string> {
    // Security validation
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Audio blob is empty')
    }

    // Check file size limit (50MB max for Gemini)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (audioBlob.size > maxSize) {
      throw new Error(
        `Audio file too large: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`
      )
    }

    // Validate MIME type
    if (!audioBlob.type.startsWith('audio/')) {
      throw new Error(`Invalid file type: ${audioBlob.type}. Expected audio format.`)
    }

    const formData = new FormData()
    formData.append('file', audioBlob, 'audio-segment.webm')

    const uploadUrl = `${this.config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'}/files?key=${this.config.apiKey}`

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Goog-Upload-Protocol': 'multipart'
        }
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')

        // Handle specific error codes
        if (response.status === 401) {
          throw new Error('Invalid API key or unauthorized access')
        } else if (response.status === 413) {
          throw new Error('File too large for upload')
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else {
          throw new Error(`Upload failed (${response.status}): ${errorText}`)
        }
      }

      const result = await response.json().catch(() => {
        throw new Error('Invalid response format from upload API')
      })

      const fileUri = result.file?.uri || result.name
      if (!fileUri) {
        throw new Error('No file URI returned from upload')
      }

      return fileUri
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error during file upload')
    }
  }

  /**
   * Calls Gemini API to generate content
   */
  private async callGeminiAPI(prompt: string, audioFileUri?: string): Promise<any> {
    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Valid prompt is required')
    }

    if (prompt.length > 100000) {
      // 100k characters max
      throw new Error('Prompt too long (max 100,000 characters)')
    }

    const model = this.config.model || 'gemini-2.5-flash-lite'

    // Build request parts - text-only or text + audio
    const parts: any[] = [{ text: prompt }]
    
    if (audioFileUri) {
      if (typeof audioFileUri !== 'string') {
        throw new Error('Invalid audio file URI format')
      }
      parts.push({
        file_data: {
          mime_type: 'audio/webm',
          file_uri: audioFileUri
        }
      })
    }

    const requestBody = {
      contents: [{
        parts
      }],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent questions
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    }

    const apiUrl = `${this.config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent?key=${this.config.apiKey}`

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')

        // Handle specific API errors
        if (response.status === 401) {
          throw new Error('Invalid API key or unauthorized access')
        } else if (response.status === 400) {
          throw new Error(`Invalid request format: ${errorText}`)
        } else if (response.status === 403) {
          throw new Error('API quota exceeded or access denied')
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (response.status >= 500) {
          throw new Error('Gemini API service unavailable. Please try again later.')
        } else {
          throw new Error(`Gemini API error (${response.status}): ${errorText}`)
        }
      }

      const result = await response.json().catch(() => {
        throw new Error('Invalid JSON response from Gemini API')
      })

      // Validate response structure
      if (!result.candidates || !Array.isArray(result.candidates)) {
        throw new Error('Invalid response structure: missing candidates array')
      }

      if (result.candidates.length === 0) {
        throw new Error('No response generated from Gemini')
      }

      const candidate = result.candidates[0]
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        throw new Error('Invalid response structure: missing content parts')
      }

      const responseText = candidate.content.parts[0].text
      if (!responseText) {
        throw new Error('Empty response from Gemini API')
      }

      return responseText
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error during API call')
    }
  }

  /**
   * Builds the prompt for question generation
   */
  private buildQuestionPrompt(loop: SavedLoop): string {
    const duration = loop.endTime - loop.startTime

    return `
You are an expert English conversation teacher analyzing a dialogue segment for listening comprehension practice.

Context:
- Video Title: "${loop.videoTitle}"
- Loop Title: "${loop.title}"
- Duration: ${duration} seconds
- Description: ${loop.description || 'No additional context provided'}
- Target: Generate exactly 10 multiple-choice questions

Instructions:
1. Listen carefully to the audio segment
2. Create 10 multiple-choice questions that test listening comprehension
3. Each question must have exactly 4 options (A, B, C, D)
4. Include a mix of question types and difficulty levels
5. Base questions ONLY on what is actually said in the audio

Question Distribution:
- 4 Easy questions (main ideas, obvious details)
- 4 Medium questions (specific details, vocabulary)
- 2 Hard questions (inference, implied meaning)

Question Types to Include:
- Main idea (What is the main topic?)
- Specific details (Who, what, when, where?)
- Vocabulary (What does X mean in this context?)
- Inference (What can we conclude?)
- Speaker attitude/emotion

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is the main topic being discussed?",
      "options": [
        "A) Travel plans for the weekend",
        "B) Work-related projects",
        "C) Restaurant recommendations", 
        "D) Weather forecast"
      ],
      "correctAnswer": "A",
      "explanation": "The speakers clearly mention planning a trip at the beginning of the conversation.",
      "difficulty": "easy",
      "type": "main_idea",
      "timestamp": 2.5
    }
  ],
  "metadata": {
    "totalQuestions": 10,
    "audioLength": ${duration},
    "analysisDate": "${new Date().toISOString()}"
  }
}

IMPORTANT: 
- Ensure all 10 questions are based on actual audio content
- Make options plausible but clearly distinguishable
- Provide helpful explanations that reference specific audio moments
- Use timestamps to indicate when in the audio the answer occurs
- Return only valid JSON, no additional text
`.trim()
  }

  /**
   * Build prompt for transcript-based question generation
   */
  private buildTranscriptQuestionPrompt(loop: any): string {
    const duration = loop.endTime - loop.startTime
    const transcriptText = loop.transcriptText.trim()
    const wordCount = transcriptText.split(/\s+/).length

    return `
You are an expert English conversation teacher analyzing a dialogue transcript for listening comprehension practice.

Context:
- Video Title: "${loop.videoTitle}"
- Loop Title: "${loop.title}"  
- Duration: ${duration} seconds
- Transcript Word Count: ${wordCount} words
- Description: ${loop.description || 'No additional context provided'}
- Target: Generate exactly 10 multiple-choice questions

TRANSCRIPT TEXT:
"${transcriptText}"

Instructions:
1. Analyze the transcript text carefully
2. Create 10 multiple-choice questions that test reading/listening comprehension
3. Each question must have exactly 4 options (A, B, C, D)
4. Include a mix of question types and difficulty levels
5. Base questions ONLY on what is actually stated in the transcript

Question Distribution:
- 4 Easy questions (main ideas, obvious details)
- 4 Medium questions (specific details, vocabulary, sequence)
- 2 Hard questions (inference, implied meaning, tone)

Question Types to Include:
- Main idea (What is the main topic discussed?)
- Specific details (Who said what? When? Where?)
- Vocabulary (What does X mean in this context?)
- Sequence (What happened first/next?)
- Inference (What can we conclude from the conversation?)
- Speaker intent/attitude

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is the main topic being discussed?",
      "options": [
        "A) Travel plans for the weekend",
        "B) Work-related projects", 
        "C) Restaurant recommendations",
        "D) Weather forecast"
      ],
      "correctAnswer": "A",
      "explanation": "The speakers clearly mention planning a trip in the transcript text.",
      "difficulty": "easy",
      "type": "main_idea",
      "timestamp": ${Math.round(loop.startTime + duration * 0.2)}
    }
  ],
  "metadata": {
    "totalQuestions": 10,
    "transcriptLength": ${transcriptText.length},
    "wordCount": ${wordCount},
    "analysisDate": "${new Date().toISOString()}"
  }
}

CRITICAL REQUIREMENTS:
- Generate exactly 10 questions based solely on the transcript content
- Make all options plausible but clearly distinguishable
- Provide helpful explanations that reference specific parts of the transcript
- Use realistic timestamps within the ${loop.startTime}-${loop.endTime} second range
- Return only valid JSON, no additional text
- Ensure questions test comprehension of the actual dialogue content
`.trim()
  }

  /**
   * Parses and validates Gemini response
   */
  private parseQuestionsResponse(response: string, loop: SavedLoop): GeminiResponse {
    try {
      const parsed = JSON.parse(response)

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array')
      }

      if (parsed.questions.length !== 10) {
        throw new Error(`Expected 10 questions, got ${parsed.questions.length}`)
      }

      // Validate each question
      const validatedQuestions: ConversationQuestion[] = parsed.questions.map(
        (q: any, index: number) => {
          if (!q.question || typeof q.question !== 'string') {
            throw new Error(`Question ${index + 1}: Missing or invalid question text`)
          }

          if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(`Question ${index + 1}: Must have exactly 4 options`)
          }

          if (!q.correctAnswer || !['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
            throw new Error(`Question ${index + 1}: Correct answer must be A, B, C, or D`)
          }

          if (!q.explanation || typeof q.explanation !== 'string') {
            throw new Error(`Question ${index + 1}: Missing explanation`)
          }

          if (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
            throw new Error(`Question ${index + 1}: Invalid difficulty level`)
          }

          if (
            !q.type ||
            !['main_idea', 'detail', 'vocabulary', 'inference', 'grammar'].includes(q.type)
          ) {
            throw new Error(`Question ${index + 1}: Invalid question type`)
          }

          return {
            id: q.id || `q${index + 1}`,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            type: q.type,
            timestamp: q.timestamp || 0
          }
        }
      )

      return {
        questions: validatedQuestions,
        metadata: {
          totalQuestions: validatedQuestions.length,
          audioLength: loop.endTime - loop.startTime,
          analysisDate: new Date().toISOString()
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON response from Gemini API')
      }
      throw error
    }
  }

  /**
   * Regenerates questions for an existing loop
   */
  async regenerateQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
    if (!loop.hasAudioSegment) {
      throw new Error(
        'Cannot regenerate questions: audio segment not available. Please recreate the loop with audio capture enabled.'
      )
    }

    console.log(`Regenerating questions for loop: ${loop.title}`)
    return await this.generateQuestions(loop)
  }

  /**
   * Validates API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      // Test API key with a simple request
      const response = await fetch(
        `${this.config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'}/models?key=${this.config.apiKey}`,
        { method: 'GET' }
      )

      return response.ok
    } catch (error) {
      console.error('Gemini API validation failed:', error)
      return false
    }
  }

  /**
   * Gets supported models
   */
  async getSupportedModels(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'}/models?key=${this.config.apiKey}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const result = await response.json()
      return result.models?.map((model: any) => model.name) || []
    } catch (error) {
      console.error('Failed to get supported models:', error)
      return []
    }
  }

  /**
   * Estimates token usage for a loop
   */
  estimateTokenUsage(loop: SavedLoop): {
    promptTokens: number
    audioProcessingCost: number
    estimatedResponseTokens: number
  } {
    const duration = loop.endTime - loop.startTime
    const audioSize = loop.audioSize || 0

    // Rough estimates
    const promptTokens = 800 // Base prompt size
    const audioProcessingCost = Math.ceil(duration * 0.5) // Tokens per second of audio
    const estimatedResponseTokens = 1500 // For 10 questions with explanations

    return {
      promptTokens,
      audioProcessingCost,
      estimatedResponseTokens
    }
  }

  /**
   * Updates API configuration
   */
  updateConfig(newConfig: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

export default ConversationAnalysisService
