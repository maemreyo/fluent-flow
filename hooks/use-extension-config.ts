// Custom hook for extension configuration management
// Handles loading and updating extension configuration

import { useState, useEffect, useCallback } from 'react'
import type { ExtensionConfig, UserPreferences } from '../lib/types'
import { MESSAGE_TYPES, STORAGE_KEYS } from '../lib/utils/constants'

interface UseExtensionConfigReturn {
  config: ExtensionConfig | null
  preferences: UserPreferences | null
  isLoading: boolean
  error: string | null
  updateConfig: (newConfig: Partial<ExtensionConfig>) => Promise<void>
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>
  refreshConfig: () => Promise<void>
}

export function useExtensionConfig(): UseExtensionConfigReturn {
  const [config, setConfig] = useState<ExtensionConfig | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get configuration from background script
      const configResponse = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_CONFIG
      })

      if (configResponse?.success) {
        setConfig(configResponse.data)
      } else {
        throw new Error(configResponse?.error || 'Failed to load configuration')
      }

      // Get user preferences from storage
      const preferencesResponse = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STORAGE_OPERATION,
        operation: 'get',
        key: STORAGE_KEYS.USER_PREFERENCES
      })

      if (preferencesResponse?.success && preferencesResponse.data) {
        setPreferences(preferencesResponse.data[STORAGE_KEYS.USER_PREFERENCES])
      } else {
        // Set default preferences if none exist
        const defaultPreferences: UserPreferences = {
          theme: 'light',
          notifications: true,
          autoSave: true,
          language: 'en',
          shortcuts: {}
        }
        setPreferences(defaultPreferences)
      }
    } catch (err) {
      console.error('Config loading error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateConfig = useCallback(async (newConfig: Partial<ExtensionConfig>) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_CONFIG,
        data: newConfig
      })

      if (response?.success) {
        setConfig(prev => prev ? { ...prev, ...newConfig } : null)
      } else {
        throw new Error(response?.error || 'Failed to update configuration')
      }
    } catch (err) {
      console.error('Config update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
    }
  }, [])

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    try {
      const updatedPreferences = preferences ? { ...preferences, ...newPreferences } : newPreferences as UserPreferences

      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STORAGE_OPERATION,
        operation: 'set',
        key: STORAGE_KEYS.USER_PREFERENCES,
        value: updatedPreferences
      })

      if (response?.success) {
        setPreferences(updatedPreferences)
      } else {
        throw new Error(response?.error || 'Failed to update preferences')
      }
    } catch (err) {
      console.error('Preferences update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
    }
  }, [preferences])

  const refreshConfig = useCallback(async () => {
    await loadConfig()
  }, [loadConfig])

  // Load configuration on mount
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Listen for configuration changes
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === MESSAGE_TYPES.CONFIG_CHANGED) {
        refreshConfig()
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)
    return () => chrome.runtime.onMessage.removeListener(messageListener)
  }, [refreshConfig])

  return {
    config,
    preferences,
    isLoading,
    error,
    updateConfig,
    updatePreferences,
    refreshConfig
  }
}