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