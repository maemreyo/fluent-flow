import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Create Supabase client for server-side operations without request context
export const createSupabaseServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Create Supabase client for server-side API routes
export const getSupabaseServer = (request?: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  if (!request) {
    // Create basic client without request context
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  // Create client with proper auth configuration
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        // Extract and set authorization header properly
        ...(() => {
          const authHeader = request.headers.get('Authorization')
          const headers: Record<string, string> = {}
          if (authHeader) {
            headers['Authorization'] = authHeader
          }
          return headers
        })()
      }
    }
  })

  return supabase
}

export const getCurrentUserServer = async (supabase: any) => {
  if (!supabase) return null

  try {
    // Use getUser() directly - the authorization header is already set in client config
    // This follows Supabase best practices for server-side auth
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()
    
    if (error) {
      // Don't log auth session missing as error - it's expected when user isn't signed in
      if (error.message !== 'Auth session missing!' && error.message !== 'invalid claim: missing sub claim') {
        console.log('Auth error:', error.message)
      }
      return null
    }
    
    if (!user) {
      return null
    }
    
    return user
  } catch (error) {
    console.log('getCurrentUserServer error:', error)
    return null
  }
}

// Helper function to handle authentication in API routes
export const withAuth = async (
  request: NextRequest,
  handler: (supabase: any, user: any) => Promise<Response>
) => {
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
