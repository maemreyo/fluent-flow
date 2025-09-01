import { createClient } from '@supabase/supabase-js'

// Get Supabase configuration from environment variables (Next.js style)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

// Default storage for Next.js (browser localStorage)
const defaultStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('Error getting item from localStorage:', error)
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('Error setting item in localStorage:', error)
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing item from localStorage:', error)
    }
  }
}

// Create Supabase client (only if URL and key are available)
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for Next.js to avoid SSR issues
    storage: defaultStorage,
    // Reduce refresh frequency to minimize API calls
    refreshTokenMarginSeconds: 300, // 5 minutes before expiry
    retryDelayMs: 2000, // 2 seconds retry delay
  },
  global: {
    headers: {
      'X-Client-Info': 'fluent-flow-web'
    }
  }
}) : null

// Export helper functions for common operations
export const getCurrentUser = async () => {
  if (!supabase) return null
  
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()
    if (error) {
      // AuthSessionMissingError is expected when no user is signed in
      if (error.message === 'Auth session missing') {
        console.debug('No user session found - user not signed in')
        return null
      }
      console.warn('Error getting current user:', error)
      return null
    }
    return user
  } catch (error) {
    // Don't throw error for missing auth session - just return null
    console.debug('No authenticated user found')
    return null
  }
}

/**
 * Authentication utilities for Quiz page
 */
export const authenticateWithToken = async (authToken: string) => {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  
  try {
    // Set the session using the token from Extension
    const { data, error } = await supabase.auth.setSession({
      access_token: authToken,
      refresh_token: authToken // In real implementation, these would be different
    })
    
    if (error) {
      console.error('Auth error:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user }
  } catch (error: any) {
    console.error('Authentication failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Share authentication state from Extension to Quiz page
 * This should be called when sharing a quiz link
 */
export const shareAuthState = async () => {
  if (!supabase) return null
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null
    
    // Return minimal auth data for sharing
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userId: session.user?.id,
      email: session.user?.email
    }
  } catch (error) {
    console.error('Error getting auth state for sharing:', error)
    return null
  }
}

/**
 * Check if user has valid session
 */
export const hasValidSession = async (): Promise<boolean> => {
  if (!supabase) return false
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    return !error && !!session?.access_token
  } catch {
    return false
  }
}

export const getSession = async () => {
  if (!supabase) return null
  
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

export const signOut = async () => {
  if (!supabase) return
  
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Auth state change listener
export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!supabase) return () => {}
  
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null)
  })
}