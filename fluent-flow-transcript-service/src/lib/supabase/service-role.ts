import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

/**
 * Service Role Supabase Client
 * 
 * This client uses the service role key and bypasses RLS policies.
 * Use ONLY for server-side operations that need elevated privileges.
 * 
 * Common use cases:
 * - Public API endpoints that need to read/write data
 * - System operations that bypass user permissions
 * - Background jobs and cleanup tasks
 */

// Cached client instance to avoid recreating
let serviceRoleClient: ReturnType<typeof createClient<Database>> | null = null

export const getSupabaseServiceRole = () => {
  // Return cached client if it exists
  if (serviceRoleClient) {
    return serviceRoleClient
  }

  // Get environment variables (supporting both naming conventions)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PLASMO_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY || process.env.PLASMO_PUBLIC_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration for service role client')
    console.error('Required: SUPABASE_URL and SERVICE_ROLE_KEY')
    return null
  }
  
  // Create and cache the service role client
  serviceRoleClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  return serviceRoleClient
}

/**
 * Helper function to check if service role client is configured
 */
export const isServiceRoleConfigured = (): boolean => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PLASMO_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY || process.env.PLASMO_PUBLIC_SERVICE_ROLE_KEY
  
  return !!(supabaseUrl && supabaseServiceKey)
}