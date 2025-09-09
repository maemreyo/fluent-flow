import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { corsResponse, corsHeaders } from '@/lib/cors'

// GET /api/prompts - List active custom prompts for users
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }
    const { searchParams } = new URL(request.url)
    
    const category = searchParams.get('category')
    const defaults_only = searchParams.get('defaults_only') === 'true'
    
    let query = supabase
      .from('custom_prompts')
      .select('id, name, description, category, config, is_default, usage_count')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }
    
    if (defaults_only) {
      query = query.eq('is_default', true)
    }

    const { data: prompts, error } = await query

    if (error) {
      console.error('Error fetching custom prompts:', error)
      return corsResponse({ error: 'Failed to fetch prompts' }, 500)
    }

    // Group by category for easier frontend consumption
    const groupedPrompts = prompts.reduce((acc: Record<string, any[]>, prompt) => {
      if (!acc[prompt.category]) {
        acc[prompt.category] = []
      }
      acc[prompt.category].push(prompt)
      return acc
    }, {})

    return corsResponse({ 
      prompts: prompts,
      grouped: groupedPrompts 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

// OPTIONS /api/prompts - Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}