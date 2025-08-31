'use client'

import type { Database } from '../supabase/types'
import { userService } from './user-service'

type UserVocabularyDeck = Database['public']['Tables']['user_vocabulary_deck']['Row']

interface WordSelectionData {
  word: string
  definition?: string
  example?: string
  context?: string
  sourceUrl?: string
  sourceTitle?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

interface ExtensionMessage {
  type:
    | 'ADD_VOCABULARY'
    | 'GET_VOCABULARY'
    | 'TOGGLE_STAR'
    | 'GET_STATS'
    | 'FLUENT_FLOW_ADD_VOCABULARY'
    | 'FLUENT_FLOW_GET_VOCABULARY'
    | 'FLUENT_FLOW_TOGGLE_STAR'
    | 'FLUENT_FLOW_GET_STATS'
  data?: any
  userId?: string
}

export class ExtensionBridgeService {
  private static instance: ExtensionBridgeService
  private messageHandlers: Map<string, (...args: any[]) => void> = new Map()

  static getInstance(): ExtensionBridgeService {
    if (!ExtensionBridgeService.instance) {
      ExtensionBridgeService.instance = new ExtensionBridgeService()
    }
    return ExtensionBridgeService.instance
  }

  constructor() {
    // Listen for messages from extension
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleExtensionMessage.bind(this))
    }
  }

  private async handleExtensionMessage(event: MessageEvent) {
    // Only accept messages from extension
    if (event.origin !== window.location.origin && !event.origin.includes('chrome-extension://')) {
      return
    }

    const message: ExtensionMessage = event.data

    if (!message.type || !message.type.startsWith('FLUENT_FLOW_')) {
      return
    }

    try {
      switch (message.type) {
        case 'FLUENT_FLOW_ADD_VOCABULARY':
          await this.handleAddVocabulary(message.data)
          break

        case 'FLUENT_FLOW_GET_VOCABULARY':
          await this.handleGetVocabulary(message.data)
          break

        case 'FLUENT_FLOW_TOGGLE_STAR':
          await this.handleToggleStar(message.data)
          break

        case 'FLUENT_FLOW_GET_STATS':
          await this.handleGetStats(message.data)
          break

        default:
          console.warn('Unknown extension message type:', message.type)
      }
    } catch (error) {
      console.error('Error handling extension message:', error)
      this.sendMessageToExtension({
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async handleAddVocabulary(data: { userId: string; wordData: WordSelectionData }) {
    const { userId, wordData } = data

    const vocabularyData = {
      text: wordData.word,
      definition: wordData.definition || '',
      example: wordData.example,
      difficulty: wordData.difficulty || 'medium',
      item_type: 'word',
      learning_status: 'new'
    }

    const result = await userService.addVocabularyToDeck(userId, vocabularyData)

    this.sendMessageToExtension({
      type: 'VOCABULARY_ADDED',
      data: result
    })

    // Notify any registered handlers
    this.messageHandlers.get('vocabulary_added')?.(result)
  }

  private async handleGetVocabulary(data: { userId: string; options?: any }) {
    const { userId, options } = data

    const vocabulary = await userService.getUserVocabulary(userId, options)

    this.sendMessageToExtension({
      type: 'VOCABULARY_DATA',
      data: vocabulary
    })
  }

  private async handleToggleStar(data: { vocabularyId: string; isStarred: boolean }) {
    const { vocabularyId, isStarred } = data

    const success = await userService.toggleVocabularyStar(vocabularyId, isStarred)

    this.sendMessageToExtension({
      type: 'STAR_TOGGLED',
      data: { vocabularyId, isStarred, success }
    })

    // Notify any registered handlers
    this.messageHandlers.get('star_toggled')?.(vocabularyId, isStarred, success)
  }

  private async handleGetStats(data: { userId: string }) {
    const { userId } = data

    const stats = await userService.getUserVocabularyStats(userId)

    this.sendMessageToExtension({
      type: 'USER_STATS',
      data: stats
    })
  }

  private sendMessageToExtension(message: any) {
    // Send message to extension
    if (typeof window !== 'undefined') {
      window.postMessage(
        {
          ...message,
          source: 'fluent-flow-quiz'
        },
        '*'
      )
    }
  }

  // Public API for Quiz page components
  public registerHandler(event: string, handler: (...args: any[]) => void) {
    this.messageHandlers.set(event, handler)
  }

  public unregisterHandler(event: string) {
    this.messageHandlers.delete(event)
  }

  // Send vocabulary to extension for word explorer
  public sendVocabularyToExtension(userId: string, vocabulary: UserVocabularyDeck[]) {
    this.sendMessageToExtension({
      type: 'SYNC_VOCABULARY',
      data: {
        userId,
        vocabulary: vocabulary.map(item => ({
          id: item.id,
          word: item.text,
          definition: item.definition,
          definition_vi: item.definition_vi,
          example: item.example,
          isStarred: item.is_starred,
          difficulty: item.difficulty,
          nextReviewDate: item.next_review_date,
          learningStatus: item.learning_status
        }))
      }
    })
  }

  // Request sync from extension
  public requestSyncFromExtension(userId: string) {
    this.sendMessageToExtension({
      type: 'REQUEST_SYNC',
      data: { userId }
    })
  }

  // Check if extension is available
  public async checkExtensionAvailability(): Promise<boolean> {
    return new Promise(resolve => {
      if (typeof window === 'undefined') {
        resolve(false)
        return
      }

      // Send ping message
      this.sendMessageToExtension({
        type: 'EXTENSION_PING'
      })

      // Wait for response
      const timeout = setTimeout(() => {
        resolve(false)
      }, 1000)

      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'EXTENSION_PONG') {
          clearTimeout(timeout)
          window.removeEventListener('message', handler)
          resolve(true)
        }
      }

      window.addEventListener('message', handler)
    })
  }

  // Initialize extension integration
  public async initializeExtensionIntegration(userId: string) {
    const isAvailable = await this.checkExtensionAvailability()

    if (isAvailable) {
      // Sync vocabulary data
      const vocabulary = await userService.getUserVocabulary(userId, { limit: 1000 })
      this.sendVocabularyToExtension(userId, vocabulary)

      console.log('✅ FluentFlow Extension integration initialized')
      return true
    } else {
      console.log('⚠️ FluentFlow Extension not detected')
      return false
    }
  }
}

export const extensionBridge = ExtensionBridgeService.getInstance()
