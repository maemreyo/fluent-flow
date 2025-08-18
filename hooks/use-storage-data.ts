// Custom hook for storage data management
// Provides reactive access to Chrome storage with automatic updates

import { useState, useEffect, useCallback } from 'react'
import { MESSAGE_TYPES } from '../lib/utils/constants'

interface UseStorageDataReturn<T = any> {
  data: T | null
  isLoading: boolean
  error: string | null
  updateData: (key: string, value: any) => Promise<void>
  removeData: (key: string) => Promise<void>
  refreshData: (keys?: string[]) => Promise<void>
  clearAllData: () => Promise<void>
}

interface UseStorageDataOptions {
  keys?: string[]
  autoLoad?: boolean
  watchChanges?: boolean
}

export function useStorageData<T = any>(
  options: UseStorageDataOptions = {}
): UseStorageDataReturn<T> {
  const { keys, autoLoad = true, watchChanges = true } = options
  
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (keysToLoad?: string[]) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STORAGE_OPERATION,
        operation: 'get',
        key: keysToLoad || keys || []
      })

      if (response?.success) {
        setData(response.data || null)
      } else {
        throw new Error(response?.error || 'Failed to load storage data')
      }
    } catch (err) {
      console.error('Storage load error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [keys])

  const updateData = useCallback(async (key: string, value: any) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STORAGE_OPERATION,
        operation: 'set',
        key,
        value
      })

      if (response?.success) {
        // Update local data if the key is being watched
        if (!keys || keys.includes(key)) {
          setData(prev => prev ? { ...prev as any, [key]: value } : { [key]: value } as T)
        }
      } else {
        throw new Error(response?.error || 'Failed to update storage data')
      }
    } catch (err) {
      console.error('Storage update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update data')
      throw err
    }
  }, [keys])

  const removeData = useCallback(async (key: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STORAGE_OPERATION,
        operation: 'remove',
        key
      })

      if (response?.success) {
        // Remove key from local data if being watched
        if (!keys || keys.includes(key)) {
          setData(prev => {
            if (!prev) return null
            const newData = { ...prev as any }
            delete newData[key]
            return newData as T
          })
        }
      } else {
        throw new Error(response?.error || 'Failed to remove storage data')
      }
    } catch (err) {
      console.error('Storage remove error:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove data')
      throw err
    }
  }, [keys])

  const clearAllData = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STORAGE_OPERATION,
        operation: 'clear'
      })

      if (response?.success) {
        setData(null)
      } else {
        throw new Error(response?.error || 'Failed to clear storage data')
      }
    } catch (err) {
      console.error('Storage clear error:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear data')
      throw err
    }
  }, [])

  const refreshData = useCallback(async (keysToRefresh?: string[]) => {
    await loadData(keysToRefresh)
  }, [loadData])

  // Load data on mount if autoLoad is enabled
  useEffect(() => {
    if (autoLoad) {
      loadData()
    }
  }, [autoLoad, loadData])

  // Listen for storage changes if watchChanges is enabled
  useEffect(() => {
    if (!watchChanges) return

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      // Check if any of the watched keys changed
      const watchedKeys = keys || []
      const changedWatchedKeys = Object.keys(changes).filter(key => 
        watchedKeys.length === 0 || watchedKeys.includes(key)
      )

      if (changedWatchedKeys.length > 0) {
        // Refresh data when watched keys change
        refreshData()
      }
    }

    // Listen to both local and sync storage changes
    chrome.storage.local.onChanged.addListener(storageListener)
    if (chrome.storage.sync) {
      chrome.storage.sync.onChanged.addListener(storageListener)
    }

    return () => {
      chrome.storage.local.onChanged.removeListener(storageListener)
      if (chrome.storage.sync) {
        chrome.storage.sync.onChanged.removeListener(storageListener)
      }
    }
  }, [watchChanges, keys, refreshData])

  return {
    data,
    isLoading,
    error,
    updateData,
    removeData,
    refreshData,
    clearAllData
  }
}

// Specialized hooks for common storage patterns
export function useStorageValue<T>(key: string, defaultValue?: T) {
  const { data, updateData: updateStorage, ...rest } = useStorageData<{ [key: string]: T }>({
    keys: [key],
    autoLoad: true,
    watchChanges: true
  })

  const value = data?.[key] ?? defaultValue ?? null
  
  const updateValue = useCallback(async (newValue: T) => {
    await updateStorage(key, newValue)
  }, [key, updateStorage])

  return {
    value,
    updateValue,
    ...rest
  }
}

export function useStorageArray<T>(key: string, defaultValue: T[] = []) {
  const { value, updateValue, ...rest } = useStorageValue<T[]>(key, defaultValue)

  const addItem = useCallback(async (item: T) => {
    const currentArray = value || defaultValue
    await updateValue([...currentArray, item])
  }, [value, defaultValue, updateValue])

  const removeItem = useCallback(async (index: number) => {
    const currentArray = value || defaultValue
    const newArray = currentArray.filter((_, i) => i !== index)
    await updateValue(newArray)
  }, [value, defaultValue, updateValue])

  const updateItem = useCallback(async (index: number, item: T) => {
    const currentArray = value || defaultValue
    const newArray = [...currentArray]
    newArray[index] = item
    await updateValue(newArray)
  }, [value, defaultValue, updateValue])

  const clearArray = useCallback(async () => {
    await updateValue([])
  }, [updateValue])

  return {
    array: value || defaultValue,
    addItem,
    removeItem,
    updateItem,
    clearArray,
    ...rest
  }
}