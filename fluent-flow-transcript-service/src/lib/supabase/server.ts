import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for server-side API routes
export const getSupabaseServer = (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Get the Authorization header or access token from cookies
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  
  if (accessToken) {
    // Set the authorization header for RLS policies
    supabase.rest.headers['authorization'] = `Bearer ${accessToken}`
    
    // Also try to set the session (async operation handled in getCurrentUserServer)
    supabase._accessToken = accessToken
  }
  
  return supabase
}

export const getCurrentUserServer = async (supabase: any) => {
  if (!supabase) return null
  
  try {
    // If we have an access token stored, try to set the session first
    if (supabase._accessToken) {
      try {
        await supabase.auth.setSession({
          access_token: supabase._accessToken,
          refresh_token: supabase._accessToken // Use same token as refresh for now
        })
      } catch (sessionError) {
        console.log('Session set warning:', sessionError)
        // Continue with getUser anyway
      }
    }
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.log('Auth error:', error)
      return null
    }
    if (!user) {
      console.log('No user found')
      return null
    }
    return user
  } catch (error) {
    console.log('getCurrentUserServer error:', error)
    return null
  }
}

// Helper function to handle authentication in API routes
export const withAuth = async (request: NextRequest, handler: (supabase: any, user: any) => Promise<Response>) => {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 })
  }

  const user = await getCurrentUserServer(supabase)
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handler(supabase, user)
}