import type {
  ConversationQuestions,
  SavedLoop,
  SharedQuestionSet,
  QuestionResponse,
  SharedQuestionSession
} from '../types/fluent-flow-types'

export interface QuestionSharingConfig {
  backendUrl: string
  apiKey?: string
}

export class QuestionSharingService {
  private config: QuestionSharingConfig

  constructor(config: QuestionSharingConfig) {
    this.config = config
  }

  /**
   * Share a question set to the backend and get a shareable link
   */
  async shareQuestions(
    questions: ConversationQuestions,
    loop: SavedLoop,
    options: {
      title?: string
      isPublic?: boolean
      sharedBy?: string
    } = {}
  ): Promise<{ shareToken: string; shareUrl: string }> {
    try {
      // Send to backend
      const response = await this.sendToBackend('/api/share-questions', {
        method: 'POST',
        body: JSON.stringify({
          questions,
          loop,
          options
        })
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to share questions')
      }

      return {
        shareToken: response.data.shareToken,
        shareUrl: response.data.shareUrl
      }
    } catch (error) {
      console.error('Failed to share questions:', error)
      throw new Error(
        `Question sharing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get shared questions by token (for the web interface)
   */
  async getSharedQuestions(shareToken: string): Promise<SharedQuestionSet> {
    try {
      const response = await this.sendToBackend(`/api/questions/${shareToken}`, {
        method: 'GET'
      })

      if (!response.success || !response.data) {
        throw new Error('Questions not found or access denied')
      }

      return response.data
    } catch (error) {
      console.error('Failed to get shared questions:', error)
      throw new Error(
        `Failed to load questions: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Submit answers for a shared question set
   */
  async submitAnswers(
    shareToken: string,
    responses: QuestionResponse[]
  ): Promise<SharedQuestionSession> {
    try {
      const response = await this.sendToBackend(`/api/questions/${shareToken}/submit`, {
        method: 'POST',
        body: JSON.stringify({ responses })
      })

      if (!response.success || !response.data) {
        throw new Error('Failed to submit answers')
      }

      return response.data
    } catch (error) {
      console.error('Failed to submit answers:', error)
      throw new Error(
        `Failed to submit answers: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get results for a completed session
   */
  async getSessionResults(sessionId: string): Promise<SharedQuestionSession> {
    try {
      const response = await this.sendToBackend(`/api/sessions/${sessionId}`, {
        method: 'GET'
      })

      if (!response.success || !response.data) {
        throw new Error('Session not found')
      }

      return response.data
    } catch (error) {
      console.error('Failed to get session results:', error)
      throw new Error(
        `Failed to load results: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate a unique share token
   */
  private generateShareToken(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 8)
    return `${timestamp}-${randomPart}`
  }

  /**
   * Calculate overall difficulty based on question mix
   */
  private calculateOverallDifficulty(
    questions: Array<{ difficulty: 'easy' | 'medium' | 'hard' }>
  ): 'mixed' | 'easy' | 'medium' | 'hard' {
    const difficulties = questions.map(q => q.difficulty)
    const uniqueDifficulties = [...new Set(difficulties)]

    if (uniqueDifficulties.length > 1) {
      return 'mixed'
    }

    return uniqueDifficulties[0] || 'medium'
  }

  /**
   * Extract topics from question types
   */
  private extractTopics(questions: Array<{ type: string }>): string[] {
    const typeMapping: Record<string, string> = {
      main_idea: 'Main Ideas',
      specific_detail: 'Details',
      vocabulary_in_context: 'Vocabulary',
      inference: 'Inference',
      speaker_tone: 'Tone & Attitude',
      language_function: 'Language Function',
      detail: 'Details',
      vocabulary: 'Vocabulary',
      grammar: 'Grammar'
    }

    const topics = questions.map(q => typeMapping[q.type] || q.type)
    return [...new Set(topics)]
  }

  /**
   * Send request to backend with error handling
   */
  private async sendToBackend(
    endpoint: string,
    options: RequestInit
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = `${this.config.backendUrl}${endpoint}`
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        ...options.headers
      }

      const response = await fetch(url, {
        ...options,
        headers
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Backend request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  /**
   * Copy share URL to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const result = document.execCommand('copy')
        document.body.removeChild(textArea)
        return result
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QuestionSharingConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Validate backend connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.sendToBackend('/api/health', {
        method: 'GET'
      })
      return response.success
    } catch {
      return false
    }
  }
}

export default QuestionSharingService