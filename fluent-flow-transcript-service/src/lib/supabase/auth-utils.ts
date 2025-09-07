import { supabase } from './client'

/**
 * Get authenticated headers for API requests
 * Uses Supabase session to get access token and add Authorization header
 * This is the recommended pattern for all authenticated API calls
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}

// Session redirection utilities for seamless auth flow
export const SessionRedirectManager = {
  // Store intended destination in localStorage  
  storeIntendedDestination(groupId: string, sessionId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_redirect_destination', JSON.stringify({
        type: 'session',
        groupId,
        sessionId,
        timestamp: Date.now()
      }))
    }
  },

  // Retrieve and clear stored destination
  getAndClearIntendedDestination(): { type: 'session', groupId: string, sessionId: string } | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('auth_redirect_destination')
      if (stored) {
        localStorage.removeItem('auth_redirect_destination')
        try {
          const data = JSON.parse(stored)
          // Check if stored destination is not too old (max 30 minutes)
          if (data.timestamp && Date.now() - data.timestamp < 30 * 60 * 1000) {
            return data
          }
        } catch (error) {
          console.error('Error parsing stored auth destination:', error)
        }
      }
    }
    return null
  },

  // Auto-join group by ID (for authenticated users)
  async autoJoinGroupById(groupId: string): Promise<{ success: boolean, error?: string }> {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/groups/auto-join', {
        method: 'POST',
        headers,
        body: JSON.stringify({ groupId })
      })

      const result = await response.json()
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to join group' }
      }

      return { success: true }
    } catch (error) {
      console.error('Auto-join error:', error)
      return { success: false, error: 'Network error' }
    }
  }
}

/**
 * Check if user has a valid authentication session
 */
export async function hasValidAuthSession(): Promise<boolean> {
  if (!supabase) return false
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    return !error && !!session?.access_token
  } catch {
    return false
  }
}

/**
 * Get current user's access token
 * Returns null if no valid session exists
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

/**
 * Create headers with custom content type and auth
 */
export async function getAuthHeadersWithContentType(contentType: string): Promise<HeadersInit> {
  const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
  const headers: HeadersInit = {
    'Content-Type': contentType
  }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}