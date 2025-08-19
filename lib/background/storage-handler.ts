// Storage Handler - Handles storage operations (Chrome local storage + Supabase for user settings)
// Centralized storage management with validation and error handling

import { validateStorageOperation } from "../utils/validation"
import type { StorageResult } from "../types"
import { getAuthHandler } from "./auth-handler"
import { supabase } from "../supabase/client"

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

    // 2. Determine if this is a user setting that should use Supabase
    const shouldUseSupabase = await shouldUseSupabaseForKey(key)

    // 3. Execute storage operation
    switch (operation) {
      case 'get':
        result = shouldUseSupabase 
          ? await getFromSupabase(key)
          : await getFromChromeStorage(key)
        break

      case 'set':
        if (typeof key !== 'string') {
          throw new Error('Set operation requires a single key')
        }
        result = shouldUseSupabase
          ? await setInSupabase(key, value)
          : await setInChromeStorage(key, value)
        break

      case 'remove':
        result = shouldUseSupabase
          ? await removeFromSupabase(key)
          : await removeFromChromeStorage(key)
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

// Determine which storage to use based on key and auth status
async function shouldUseSupabaseForKey(key: string | string[]): Promise<boolean> {
  // User setting keys that should be synced to Supabase when authenticated
  const userSettingKeys = [
    'user_preferences',
    'fluent_flow_settings', 
    'api_config',
    'theme',
    'language',
    'shortcuts'
  ]

  // Check if user is authenticated
  const authHandler = getAuthHandler()
  if (!authHandler.isAuthenticated()) {
    return false
  }

  // Check if any of the keys are user settings
  const keys = Array.isArray(key) ? key : [key]
  return keys.some(k => userSettingKeys.some(setting => k.includes(setting)))
}

// Supabase storage functions
async function getFromSupabase(key: string | string[]): Promise<StorageResult> {
  try {
    const authHandler = getAuthHandler()
    const user = authHandler.getCurrentUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const keys = Array.isArray(key) ? key : [key]
    const result: Record<string, any> = {}

    // Get user profile with settings
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    // Extract requested keys from profile settings
    const settings = (profile?.settings as Record<string, any>) || {}
    for (const k of keys) {
      if (k === 'user_preferences' && settings.user_preferences) {
        result[k] = settings.user_preferences
      } else if (k === 'api_config' && settings.api_config) {
        result[k] = settings.api_config
      } else if (settings[k]) {
        result[k] = settings[k]
      }
    }

    return {
      operation: 'get',
      success: true,
      data: result,
      key: keys
    }
  } catch (error) {
    console.error('Failed to get from Supabase:', error)
    // Fallback to chrome storage
    return getFromChromeStorage(key)
  }
}

async function setInSupabase(key: string, value: any): Promise<StorageResult> {
  try {
    const authHandler = getAuthHandler()
    const user = authHandler.getCurrentUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get current profile settings
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    // Update settings
    const currentSettings = (profile?.settings as Record<string, any>) || {}
    const updatedSettings = {
      ...currentSettings,
      [key]: value
    }

    // Upsert profile with updated settings
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      throw upsertError
    }

    return {
      operation: 'set',
      success: true,
      key: [key],
      value: value
    }
  } catch (error) {
    console.error('Failed to set in Supabase:', error)
    // Fallback to chrome storage
    return setInChromeStorage(key, value)
  }
}

async function removeFromSupabase(key: string | string[]): Promise<StorageResult> {
  try {
    const authHandler = getAuthHandler()
    const user = authHandler.getCurrentUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const keys = Array.isArray(key) ? key : [key]

    // Get current profile settings
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    // Remove keys from settings
    const currentSettings = (profile?.settings as Record<string, any>) || {}
    const updatedSettings = { ...currentSettings }
    
    for (const k of keys) {
      delete updatedSettings[k]
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    return {
      operation: 'remove',
      success: true,
      key: keys
    }
  } catch (error) {
    console.error('Failed to remove from Supabase:', error)
    // Fallback to chrome storage
    return removeFromChromeStorage(key)
  }
}

// Chrome storage functions (renamed)
async function getFromChromeStorage(key: string | string[]): Promise<StorageResult> {
  try {
    const result = await chrome.storage.local.get(key)
    
    return {
      operation: 'get',
      success: true,
      data: result,
      key: Array.isArray(key) ? key : [key]
    }
  } catch (error) {
    throw new Error(`Failed to get from chrome storage: ${error}`)
  }
}

async function setInChromeStorage(key: string, value: any): Promise<StorageResult> {
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
    throw new Error(`Failed to set in chrome storage: ${error}`)
  }
}

async function removeFromChromeStorage(key: string | string[]): Promise<StorageResult> {
  try {
    await chrome.storage.local.remove(key)
    
    return {
      operation: 'remove',
      success: true,
      key: Array.isArray(key) ? key : [key]
    }
  } catch (error) {
    throw new Error(`Failed to remove from chrome storage: ${error}`)
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