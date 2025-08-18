// AI Store - Zustand store for AI functionality
// Manages AI conversations, providers, and processing state

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Storage } from '@plasmohq/storage'
import type { 
  AIConfig,
  AIProvider,
  AIConversation,
  ChatMessage,
  AIProcessingResult,
  AIFeature,
  AICapability
} from '../types'

const storage = new Storage()

interface AIState {
  // Configuration
  providers: Record<AIProvider, AIConfig | null>
  activeProvider: AIProvider
  availableModels: Record<AIProvider, string[]>
  
  // Conversations
  conversations: AIConversation[]
  activeConversation: string | null
  
  // Processing
  isProcessing: boolean
  processingHistory: AIProcessingResult[]
  streamingContent: string
  
  // Features
  availableFeatures: AIFeature[]
  enabledFeatures: string[]
  
  // UI State
  showAIPanel: boolean
  selectedText: string
  
  // Actions
  setProvider: (provider: AIProvider, config: AIConfig) => void
  setActiveProvider: (provider: AIProvider) => void
  updateProviderConfig: (provider: AIProvider, config: Partial<AIConfig>) => void
  
  // Conversation management
  createConversation: (title?: string) => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: ChatMessage) => void
  updateConversation: (id: string, updates: Partial<AIConversation>) => void
  
  // Processing
  startProcessing: () => void
  stopProcessing: () => void
  addProcessingResult: (result: AIProcessingResult) => void
  setStreamingContent: (content: string) => void
  clearStreamingContent: () => void
  
  // Features
  setAvailableFeatures: (features: AIFeature[]) => void
  toggleFeature: (featureId: string) => void
  enableFeature: (featureId: string) => void
  disableFeature: (featureId: string) => void
  
  // UI
  toggleAIPanel: () => void
  setSelectedText: (text: string) => void
  
  // Storage
  loadFromStorage: () => Promise<void>
  saveToStorage: () => Promise<void>
}

// Default AI features
const defaultFeatures: AIFeature[] = [
  {
    id: 'summarize',
    name: 'Summarize Text',
    description: 'Create concise summaries of long text',
    category: 'text-processing',
    requiredCapabilities: ['text-generation', 'summarization'],
    enabled: true
  },
  {
    id: 'translate',
    name: 'Translate Text',
    description: 'Translate text to different languages',
    category: 'translation',
    requiredCapabilities: ['text-generation', 'translation'],
    enabled: true
  },
  {
    id: 'explain',
    name: 'Explain Text',
    description: 'Get explanations for complex text',
    category: 'analysis',
    requiredCapabilities: ['text-analysis', 'text-generation'],
    enabled: true
  },
  {
    id: 'analyze_sentiment',
    name: 'Analyze Sentiment',
    description: 'Analyze the sentiment of text',
    category: 'analysis',
    requiredCapabilities: ['text-analysis'],
    enabled: true
  },
  {
    id: 'generate_email',
    name: 'Generate Email',
    description: 'Generate professional emails',
    category: 'generation',
    requiredCapabilities: ['text-generation'],
    enabled: true
  },
  {
    id: 'extract_keywords',
    name: 'Extract Keywords',
    description: 'Extract key terms and phrases',
    category: 'analysis',
    requiredCapabilities: ['text-analysis'],
    enabled: true
  }
]

// Default models for each provider
const defaultModels: Record<AIProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  custom: ['custom-model-1']
}

export const useAIStore = create<AIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        providers: {
          openai: null,
          anthropic: null,
          custom: null
        },
        activeProvider: 'openai',
        availableModels: defaultModels,
        conversations: [],
        activeConversation: null,
        isProcessing: false,
        processingHistory: [],
        streamingContent: '',
        availableFeatures: defaultFeatures,
        enabledFeatures: defaultFeatures.filter(f => f.enabled).map(f => f.id),
        showAIPanel: false,
        selectedText: '',

        // Provider actions
        setProvider: (provider, config) =>
          set((state) => ({
            providers: {
              ...state.providers,
              [provider]: config
            }
          })),

        setActiveProvider: (provider) => 
          set({ activeProvider: provider }),

        updateProviderConfig: (provider, config) =>
          set((state) => ({
            providers: {
              ...state.providers,
              [provider]: state.providers[provider] 
                ? { ...state.providers[provider]!, ...config }
                : null
            }
          })),

        // Conversation management
        createConversation: (title) => {
          const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const conversation: AIConversation = {
            id,
            title: title || `Conversation ${get().conversations.length + 1}`,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            provider: get().activeProvider,
            model: get().availableModels[get().activeProvider][0] || ''
          }

          set((state) => ({
            conversations: [conversation, ...state.conversations],
            activeConversation: id
          }))

          return id
        },

        deleteConversation: (id) =>
          set((state) => ({
            conversations: state.conversations.filter(c => c.id !== id),
            activeConversation: state.activeConversation === id ? null : state.activeConversation
          })),

        setActiveConversation: (id) => 
          set({ activeConversation: id }),

        addMessage: (conversationId, message) =>
          set((state) => ({
            conversations: state.conversations.map(conv =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: [...conv.messages, { ...message, timestamp: Date.now() }],
                    updatedAt: Date.now()
                  }
                : conv
            )
          })),

        updateConversation: (id, updates) =>
          set((state) => ({
            conversations: state.conversations.map(conv =>
              conv.id === id
                ? { ...conv, ...updates, updatedAt: Date.now() }
                : conv
            )
          })),

        // Processing actions
        startProcessing: () => 
          set({ isProcessing: true }),

        stopProcessing: () => 
          set({ isProcessing: false, streamingContent: '' }),

        addProcessingResult: (result) =>
          set((state) => ({
            processingHistory: [result, ...state.processingHistory.slice(0, 99)] // Keep last 100
          })),

        setStreamingContent: (content) => 
          set({ streamingContent: content }),

        clearStreamingContent: () => 
          set({ streamingContent: '' }),

        // Feature management
        setAvailableFeatures: (features) => 
          set({ availableFeatures: features }),

        toggleFeature: (featureId) => 
          set((state) => ({
            enabledFeatures: state.enabledFeatures.includes(featureId)
              ? state.enabledFeatures.filter(id => id !== featureId)
              : [...state.enabledFeatures, featureId]
          })),

        enableFeature: (featureId) =>
          set((state) => ({
            enabledFeatures: state.enabledFeatures.includes(featureId)
              ? state.enabledFeatures
              : [...state.enabledFeatures, featureId]
          })),

        disableFeature: (featureId) =>
          set((state) => ({
            enabledFeatures: state.enabledFeatures.filter(id => id !== featureId)
          })),

        // UI actions
        toggleAIPanel: () => 
          set((state) => ({ showAIPanel: !state.showAIPanel })),

        setSelectedText: (text) => 
          set({ selectedText: text }),

        // Storage actions
        loadFromStorage: async () => {
          try {
            const [providers, conversations, history, enabledFeatures] = await Promise.all([
              storage.get('ai_providers'),
              storage.get('ai_conversations'),
              storage.get('ai_processing_history'),
              storage.get('ai_enabled_features')
            ])

            set({
              providers: (typeof providers === 'string' ? JSON.parse(providers) : providers) || get().providers,
              conversations: (typeof conversations === 'string' ? JSON.parse(conversations) : conversations) || [],
              processingHistory: (typeof history === 'string' ? JSON.parse(history) : history) || [],
              enabledFeatures: (typeof enabledFeatures === 'string' ? JSON.parse(enabledFeatures) : enabledFeatures) || get().enabledFeatures
            })
          } catch (error) {
            console.error('Failed to load AI data from storage:', error)
          }
        },

        saveToStorage: async () => {
          try {
            const state = get()
            await Promise.all([
              storage.set('ai_providers', state.providers),
              storage.set('ai_conversations', state.conversations),
              storage.set('ai_processing_history', state.processingHistory),
              storage.set('ai_enabled_features', state.enabledFeatures)
            ])
          } catch (error) {
            console.error('Failed to save AI data to storage:', error)
          }
        }
      }),
      {
        name: 'ai-store',
        partialize: (state) => ({
          providers: state.providers,
          activeProvider: state.activeProvider,
          conversations: state.conversations,
          enabledFeatures: state.enabledFeatures,
          showAIPanel: state.showAIPanel
        })
      }
    ),
    {
      name: 'ai-store'
    }
  )
)

// Selectors for optimized re-renders
export const useAIProviders = () => useAIStore((state) => ({
  providers: state.providers,
  activeProvider: state.activeProvider,
  availableModels: state.availableModels
}))

export const useAIConversations = () => useAIStore((state) => ({
  conversations: state.conversations,
  activeConversation: state.activeConversation,
  isProcessing: state.isProcessing
}))

export const useAIFeatures = () => useAIStore((state) => ({
  availableFeatures: state.availableFeatures,
  enabledFeatures: state.enabledFeatures
}))

export const useAIProcessing = () => useAIStore((state) => ({
  isProcessing: state.isProcessing,
  processingHistory: state.processingHistory,
  streamingContent: state.streamingContent
}))

export const useAIUI = () => useAIStore((state) => ({
  showAIPanel: state.showAIPanel,
  selectedText: state.selectedText
}))

// Action hooks
export const useAIActions = () => useAIStore((state) => ({
  setProvider: state.setProvider,
  setActiveProvider: state.setActiveProvider,
  updateProviderConfig: state.updateProviderConfig,
  createConversation: state.createConversation,
  deleteConversation: state.deleteConversation,
  setActiveConversation: state.setActiveConversation,
  addMessage: state.addMessage,
  updateConversation: state.updateConversation,
  startProcessing: state.startProcessing,
  stopProcessing: state.stopProcessing,
  addProcessingResult: state.addProcessingResult,
  setStreamingContent: state.setStreamingContent,
  clearStreamingContent: state.clearStreamingContent,
  toggleFeature: state.toggleFeature,
  enableFeature: state.enableFeature,
  disableFeature: state.disableFeature,
  toggleAIPanel: state.toggleAIPanel,
  setSelectedText: state.setSelectedText,
  loadFromStorage: state.loadFromStorage,
  saveToStorage: state.saveToStorage
}))

// Helper function to get active conversation
export const useActiveConversation = () => {
  return useAIStore((state) => {
    if (!state.activeConversation) return null
    return state.conversations.find(c => c.id === state.activeConversation) || null
  })
}

// Helper function to get enabled features
export const useEnabledFeatures = () => {
  return useAIStore((state) => 
    state.availableFeatures.filter(f => state.enabledFeatures.includes(f.id))
  )
}

// Helper function to check if provider is configured
export const useIsProviderConfigured = (provider: AIProvider) => {
  return useAIStore((state) => {
    const config = state.providers[provider]
    return config !== null && config.apiKey.length > 0
  })
}