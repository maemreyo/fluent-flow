import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, supabase } from '../../../../lib/supabase/client'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return corsResponse({
        success: false,
        error: 'Supabase not configured',
        config: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      }, 500)
    }

    // Test basic Supabase connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (healthError) {
      return corsResponse({
        success: false,
        error: 'Supabase connection failed',
        details: healthError.message,
        config: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      }, 500)
    }

    // Test authentication
    const user = await getCurrentUser()
    
    return corsResponse({
      success: true,
      message: 'Supabase connection successful',
      config: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      auth: {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email
      },
      healthCheck: {
        queryWorked: !healthError,
        profilesTableAccessible: true
      }
    })

  } catch (error) {
    console.error('Supabase test failed:', error)
    return corsResponse({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}