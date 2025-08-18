// Storage Handler - Handles Chrome storage operations
// Centralized storage management with validation and error handling

import { validateStorageOperation } from "../utils/validation"
import type { StorageResult } from "../types"

export async function handleStorageMessage(
  operation: 'get' | 'set' | 'remove' | 'clear',
  key: string | string[],
  value?: any,
  sendResponse?: Function
): Promise<void> {
  console.log("Handling storage operation:", operation, key)

  try {
    // 1. Validate storage operation
    const validation = validateStorageOperation(operation, key, value)
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid storage operation')
    }

    let result: StorageResult

    // 2. Execute storage operation
    switch (operation) {
      case 'get':
        result = await getFromStorage(key)
        break

      case 'set':
        if (typeof key !== 'string') {
          throw new Error('Set operation requires a single key')
        }
        result = await setInStorage(key, value)
        break

      case 'remove':
        result = await removeFromStorage(key)
        break

      case 'clear':
        result = await clearStorage()
        break

      default:
        throw new Error(`Unknown storage operation: ${operation}`)
    }

    if (sendResponse) {
      sendResponse({
        success: true,
        data: result,
        timestamp: Date.now()
      })
    }

    console.log("Storage operation completed successfully")

  } catch (error) {
    console.error('Storage operation failed:', error)
    
    if (sendResponse) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Storage operation failed',
        code: 'STORAGE_ERROR',
        timestamp: Date.now()
      })
    }
  }
}

async function getFromStorage(key: string | string[]): Promise<StorageResult> {
  try {
    const result = await chrome.storage.local.get(key)
    
    return {
      operation: 'get',
      success: true,
      data: result,
      key: Array.isArray(key) ? key : [key]
    }
  } catch (error) {
    throw new Error(`Failed to get from storage: ${error}`)
  }
}

async function setInStorage(key: string, value: any): Promise<StorageResult> {
  try {
    // Check storage quota
    const usage = await chrome.storage.local.getBytesInUse()
    const maxBytes = chrome.storage.local.QUOTA_BYTES
    
    if (usage > maxBytes * 0.9) { // 90% of quota
      console.warn('Storage quota nearly exceeded:', usage, '/', maxBytes)
    }

    await chrome.storage.local.set({ [key]: value })
    
    return {
      operation: 'set',
      success: true,
      key: [key],
      value: value
    }
  } catch (error) {
    throw new Error(`Failed to set in storage: ${error}`)
  }
}

async function removeFromStorage(key: string | string[]): Promise<StorageResult> {
  try {
    await chrome.storage.local.remove(key)
    
    return {
      operation: 'remove',
      success: true,
      key: Array.isArray(key) ? key : [key]
    }
  } catch (error) {
    throw new Error(`Failed to remove from storage: ${error}`)
  }
}

async function clearStorage(): Promise<StorageResult> {
  try {
    await chrome.storage.local.clear()
    
    return {
      operation: 'clear',
      success: true,
      key: []
    }
  } catch (error) {
    throw new Error(`Failed to clear storage: ${error}`)
  }
}

// Utility function to check storage usage
export async function getStorageUsage(): Promise<{
  used: number
  total: number
  percentage: number
}> {
  try {
    const used = await chrome.storage.local.getBytesInUse()
    const total = chrome.storage.local.QUOTA_BYTES
    const percentage = Math.round((used / total) * 100)

    return { used, total, percentage }
  } catch (error) {
    console.error('Failed to get storage usage:', error)
    return { used: 0, total: 0, percentage: 0 }
  }
}