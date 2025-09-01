import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer(request)
  
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.replace('Bearer ', '')
  
  const debugInfo = {
    hasSupabaseClient: !!supabase,
    hasAuthHeader: !!authHeader,
    hasAccessToken: !!accessToken,
    tokenLength: accessToken ? accessToken.length : 0,
    tokenPrefix: accessToken ? accessToken.substring(0, 10) + '...' : null,
    timestamp: new Date().toISOString()
  }

  if (!supabase) {
    return corsResponse({ 
      error: 'Database not configured',
      debug: debugInfo
    }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    
    return corsResponse({
      success: true,
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      debug: debugInfo
    })
  } catch (error) {
    return corsResponse({
      error: 'Authentication error',
      message: error instanceof Error ? error.message : 'Unknown error',
      debug: debugInfo
    }, 401)
  }
}