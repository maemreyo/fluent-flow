// Extension Store - Zustand-based state management
// Replaces custom hooks with professional state management

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Storage } from '@plasmohq/storage'
import { useEffect } from 'react'
import type { 
  ExtensionConfig, 
  UserPreferences, 
  ProcessResult,
  FeatureData 
} from '../types'

// Storage instance
const storage = new Storage()

// Extension State Interface
interface ExtensionState {
  // Configuration
  config: ExtensionConfig | null
  preferences: UserPreferences | null
  isConfigLoading: boolean
  configError: string | null

  // Processing
  isProcessing: boolean
  currentResult: ProcessResult | null
  processingHistory: ProcessResult[]
  processingError: string | null

  // UI State
  activeTab: string
  sidebarOpen: boolean
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timestamp: number
  }>

  // Actions
  setConfig: (config: ExtensionConfig) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  startProcessing: (data: FeatureData) => void
  setProcessingResult: (result: ProcessResult) => void
  setProcessingError: (error: string) => void
  clearProcessingState: () => void
  addToHistory: (result: ProcessResult) => void
  clearHistory: () => void
  setActiveTab: (tab: string) => void
  toggleSidebar: () => void
  addNotification: (notification: Omit<ExtensionState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  loadFromStorage: () => Promise<void>
  saveToStorage: () => Promise<void>
}

// Create the store
export const useExtensionStore = create<ExtensionState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        config: null,
        preferences: {
          theme: 'light',
          notifications: true,
          autoSave: true,
          language: 'en',
          shortcuts: {}
        },
        isConfigLoading: false,
        configError: null,
        isProcessing: false,
        currentResult: null,
        processingHistory: [],
        processingError: null,
        activeTab: 'process',
        sidebarOpen: false,
        notifications: [],

        // Configuration actions
        setConfig: (config) => set({ config }),
        
        updatePreferences: (newPreferences) => 
          set((state) => ({
            preferences: state.preferences 
              ? { ...state.preferences, ...newPreferences }
              : newPreferences as UserPreferences
          })),

        // Processing actions
        startProcessing: (data) => 
          set({ 
            isProcessing: true, 
            processingError: null,
            currentResult: null 
          }),

        setProcessingResult: (result) => 
          set((state) => ({ 
            isProcessing: false,
            currentResult: result,
            processingHistory: [result, ...state.processingHistory.slice(0, 49)]
          })),

        setProcessingError: (error) => 
          set({ 
            isProcessing: false, 
            processingError: error,
            currentResult: null 
          }),

        clearProcessingState: () => 
          set({ 
            isProcessing: false,
            currentResult: null,
            processingError: null 
          }),

        addToHistory: (result) =>
          set((state) => ({
            processingHistory: [result, ...state.processingHistory.slice(0, 49)]
          })),

        clearHistory: () => set({ processingHistory: [] }),

        // UI actions
        setActiveTab: (tab) => set({ activeTab: tab }),
        
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        addNotification: (notification) =>
          set((state) => ({
            notifications: [
              {
                ...notification,
                id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now()
              },
              ...state.notifications.slice(0, 4) // Keep max 5 notifications
            ]
          })),

        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          })),

        // Storage actions
        loadFromStorage: async () => {
          try {
            set({ isConfigLoading: true, configError: null })
            
            const [preferences, history] = await Promise.all([
              storage.get('user_preferences'),
              storage.get('processing_history')
            ])

            set({
              preferences: (typeof preferences === 'string' ? JSON.parse(preferences) : preferences) || get().preferences,
              processingHistory: (typeof history === 'string' ? JSON.parse(history) : history) || [],
              isConfigLoading: false
            })
          } catch (error) {
            set({ 
              configError: error instanceof Error ? error.message : 'Failed to load data',
              isConfigLoading: false 
            })
          }
        },

        saveToStorage: async () => {
          try {
            const { preferences, processingHistory } = get()
            
            await Promise.all([
              storage.set('user_preferences', preferences),
              storage.set('processing_history', processingHistory)
            ])
          } catch (error) {
            console.error('Failed to save to storage:', error)
          }
        }
      }),
      {
        name: 'extension-store',
        // Only persist certain fields
        partialize: (state) => ({
          preferences: state.preferences,
          activeTab: state.activeTab,
          sidebarOpen: state.sidebarOpen
        })
      }
    ),
    {
      name: 'extension-store'
    }
  )
)

// Selectors for optimized re-renders
export const useConfig = () => useExtensionStore((state) => ({
  config: state.config,
  isLoading: state.isConfigLoading,
  error: state.configError
}))

export const usePreferences = () => useExtensionStore((state) => state.preferences)

export const useProcessing = () => useExtensionStore((state) => ({
  isProcessing: state.isProcessing,
  result: state.currentResult,
  error: state.processingError,
  history: state.processingHistory
}))

export const useUI = () => useExtensionStore((state) => ({
  activeTab: state.activeTab,
  sidebarOpen: state.sidebarOpen,
  notifications: state.notifications
}))

// Action hooks for cleaner component usage
export const useExtensionActions = () => useExtensionStore((state) => ({
  setConfig: state.setConfig,
  updatePreferences: state.updatePreferences,
  startProcessing: state.startProcessing,
  setProcessingResult: state.setProcessingResult,
  setProcessingError: state.setProcessingError,
  clearProcessingState: state.clearProcessingState,
  addToHistory: state.addToHistory,
  clearHistory: state.clearHistory,
  setActiveTab: state.setActiveTab,
  toggleSidebar: state.toggleSidebar,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  loadFromStorage: state.loadFromStorage,
  saveToStorage: state.saveToStorage
}))

// Helper hook for automatic storage sync
export const useStorageSync = () => {
  const { loadFromStorage, saveToStorage } = useExtensionActions()
  
  // Load on mount
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  // Auto-save on changes
  useEffect(() => {
    const unsubscribe = useExtensionStore.subscribe(
      () => {
        // Debounce saves
        const timeoutId = setTimeout(saveToStorage, 1000)
        return () => clearTimeout(timeoutId)
      }
    )

    return unsubscribe
  }, [saveToStorage])
}