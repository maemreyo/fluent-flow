import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer, getSupabaseServer } from '@/lib/supabase/server'
import { corsResponse, corsHeaders } from '@/lib/cors'

// GET /api/custom-prompts - List active custom prompts (for non-admin users)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }

    const user = await getCurrentUserServer(supabase)
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const active_only = searchParams.get('active_only') === 'true'
    
    let query = supabase
      .from('custom_prompts')
      .select('id, name, description, category, system_prompt, user_template, config, is_active, is_default, created_at')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }
    
    // Non-admin users can only see active prompts
    if (active_only || true) { // Always filter active for non-admin
      query = query.eq('is_active', true)
    }

    const { data: prompts, error } = await query

    if (error) {
      console.error('Error fetching custom prompts:', error)
      return corsResponse({ error: 'Failed to fetch prompts' }, 500)
    }

    return corsResponse({ prompts })
  } catch (error) {
    console.error('Unexpected error:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

// OPTIONS /api/custom-prompts - Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}