import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL || 'https://fxawystovhtbuqhllswl.supabase.co'
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4YXd5c3Rvdmh0YnVxaGxsc3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODMwMDIsImV4cCI6MjA3MTA1OTAwMn0.sT26Fks0DfeOKtULF0-rCKqlVsR7CX7JTAPvgStNH58'

// Validate configuration
if (!supabaseUrl.startsWith('https://')) {
  console.error('Invalid Supabase URL. Must start with https://')
}

if (supabaseAnonKey.length < 100) {
  console.error('Invalid Supabase anon key. Key appears to be too short.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Export helper functions for common operations
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
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