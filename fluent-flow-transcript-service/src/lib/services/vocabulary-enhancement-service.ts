/**
 * Service to enhance vocabulary items with AI-generated data
 * Adds pronunciation, Vietnamese definition, examples, part of speech, etc.
 */

export interface VocabularyEnhancementData {
  definition_en: string
  definition_vi: string
  example: string
  pronunciation: string
  part_of_speech: string
  synonyms: string[]
  antonyms: string[]
}

export class VocabularyEnhancementService {
  private static instance: VocabularyEnhancementService

  static getInstance(): VocabularyEnhancementService {
    if (!this.instance) {
      this.instance = new VocabularyEnhancementService()
    }
    return this.instance
  }

  /**
   * Enhance a vocabulary word with AI-generated data
   */
  async enhanceVocabulary(
    word: string,
    context: string,
    difficulty: string = 'intermediate'
  ): Promise<VocabularyEnhancementData | null> {
    try {
      console.log(`Enhancing vocabulary word: "${word}" with context: "${context.slice(0, 50)}..."`)

      // Use the Gemini API to generate enhanced data
      const prompt = this.createEnhancementPrompt(word, context, difficulty)
      const enhancedData = await this.callAI(prompt)

      if (enhancedData) {
        console.log(`Successfully enhanced word: "${word}"`)
        return enhancedData
      }

      return null
    } catch (error) {
      console.error('Failed to enhance vocabulary:', error)
      return null
    }
  }

  /**
   * Create a detailed prompt for AI enhancement
   */
  private createEnhancementPrompt(word: string, context: string, difficulty: string): string {
    return `Please analyze the word "${word}" in this context: "${context}"

Generate comprehensive vocabulary data in JSON format with these fields:

1. definition_en: Clear, concise English definition of "${word}"
2. definition_vi: Vietnamese definition (clear and accurate translation)
3. example: A clear, practical example sentence using "${word}" 
4. pronunciation: IPA phonetic transcription for "${word}"
5. part_of_speech: grammatical category (noun, verb, adjective, etc.)
6. synonyms: array of 2-3 similar words
7. antonyms: array of 2-3 opposite words (if applicable)

Requirements:
- Keep it at ${difficulty} level
- English definition should be clear and dictionary-style
- Vietnamese definition should be natural and understandable
- Example should be different from the given context
- Ensure pronunciation is accurate IPA notation
- Synonyms/antonyms should be commonly used words

Respond ONLY with valid JSON in this exact format:
{
  "definition_en": "English definition here",
  "definition_vi": "Vietnamese definition here",
  "example": "Example sentence here",
  "pronunciation": "/aɪˈpiːeɪ/",
  "part_of_speech": "noun",
  "synonyms": ["word1", "word2", "word3"],
  "antonyms": ["word1", "word2"]
}`
  }

  /**
   * Call AI service to generate enhancement data
   */
  private async callAI(prompt: string): Promise<VocabularyEnhancementData | null> {
    try {
      // Use Gemini API directly for vocabulary enhancement
      const response = await this.callGeminiAPI(prompt)
      
      if (!response) {
        console.warn('No response from Gemini API')
        return null
      }

      // Try to parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('No JSON found in AI response:', response)
        return null
      }

      const enhancedData = JSON.parse(jsonMatch[0]) as VocabularyEnhancementData
      
      // Validate the response
      if (this.isValidEnhancementData(enhancedData)) {
        return enhancedData
      } else {
        console.warn('Invalid enhancement data structure:', enhancedData)
        return null
      }
    } catch (error) {
      console.error('Error calling AI service:', error)
      return null
    }
  }

  /**
   * Direct call to Gemini API for vocabulary enhancement
   */
  private async callGeminiAPI(prompt: string): Promise<string | null> {
    try {
      const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyCl1jfg2xVuywGALjaBfzrQ95tgZbNE08M'
      const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
      
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!response.ok) {
        console.error('Gemini API error:', response.status, response.statusText)
        return null
      }

      const data = await response.json()
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.warn('Unexpected Gemini API response structure:', data)
        return null
      }

      const text = data.candidates[0].content.parts[0].text
      return text
    } catch (error) {
      console.error('Error calling Gemini API directly:', error)
      return null
    }
  }

  /**
   * Validate the enhancement data structure
   */
  private isValidEnhancementData(data: any): data is VocabularyEnhancementData {
    return (
      data &&
      typeof data.definition_en === 'string' &&
      typeof data.definition_vi === 'string' &&
      typeof data.example === 'string' &&
      typeof data.pronunciation === 'string' &&
      typeof data.part_of_speech === 'string' &&
      Array.isArray(data.synonyms) &&
      Array.isArray(data.antonyms)
    )
  }

  /**
   * Create fallback data when AI enhancement fails
   */
  private createFallbackData(word: string, context: string): VocabularyEnhancementData {
    // Basic fallback with minimal information
    return {
      definition_en: `A ${word.includes(' ') ? 'phrase' : 'word'} encountered in learning context.`,
      definition_vi: `Từ được chọn từ ngữ cảnh: ${context.slice(0, 50)}...`,
      example: `This word "${word}" was selected from learning material.`,
      pronunciation: `/${word}/`, // Basic fallback
      part_of_speech: word.includes(' ') ? 'phrase' : 'word',
      synonyms: [],
      antonyms: []
    }
  }

  /**
   * Enhance vocabulary with retry logic
   */
  async enhanceVocabularyWithRetry(
    word: string,
    context: string,
    difficulty: string = 'intermediate',
    maxRetries: number = 2
  ): Promise<VocabularyEnhancementData> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Enhancement attempt ${attempt}/${maxRetries} for word: "${word}"`)
      
      const enhanced = await this.enhanceVocabulary(word, context, difficulty)
      if (enhanced) {
        return enhanced
      }
      
      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    console.warn(`All enhancement attempts failed for word: "${word}", using fallback`)
    return this.createFallbackData(word, context)
  }
}

// Export singleton instance
export const vocabularyEnhancementService = VocabularyEnhancementService.getInstance()