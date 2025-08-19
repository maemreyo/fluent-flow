import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('PLASMO_PUBLIC_SUPABASE_URL is required in environment variables')
}

if (!supabaseAnonKey) {
  throw new Error('PLASMO_PUBLIC_SUPABASE_ANON_KEY is required in environment variables')
}

// Validate configuration
if (!supabaseUrl.startsWith('https://')) {
  console.error('Invalid Supabase URL. Must start with https://')
}

if (supabaseAnonKey.length < 100) {
  console.error('Invalid Supabase anon key. Key appears to be too short.')
}

// Custom storage adapter for Chrome extensions
const chromeExtensionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get([key])
      return result[key] || null
    } catch (error) {
      console.error('Error getting item from chrome storage:', error)
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [key]: value })
    } catch (error) {
      console.error('Error setting item in chrome storage:', error)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await chrome.storage.local.remove([key])
    } catch (error) {
      console.error('Error removing item from chrome storage:', error)
    }
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: chromeExtensionStorage
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Export helper functions for common operations
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      // AuthSessionMissingError is expected when no user is signed in
      if (error.message === 'Auth session missing') {
        console.debug('No user session found - user not signed in')
        return null
      }
      console.error('Error getting current user:', error)
      return null
    }
    return user
  } catch (error) {
    // Don't throw error for missing auth session - just return null
    console.debug('No authenticated user found')
    return null
  }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Auth state change listener
export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null)
  })
}