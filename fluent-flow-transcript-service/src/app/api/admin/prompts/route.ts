import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserServer, getSupabaseServer } from '@/lib/supabase/server'
import { corsResponse, corsHeaders } from '@/lib/cors'

// Request validation schemas
const createPromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  category: z.enum([
    'listening_comprehension',
    'detail_focused', 
    'inference_implication',
    'tone_analysis',
    'vocabulary_context',
    'language_function',
    'general'
  ]),
  system_prompt: z.string().min(10, 'System prompt is required'),
  user_template: z.string().min(10, 'User template is required'),
  config: z.object({
    maxTokens: z.number().min(1000).max(64000).optional(),
    temperature: z.number().min(0).max(2).optional()
  }).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional()
})

const updatePromptSchema = createPromptSchema.partial()

// Check if user is admin
async function checkAdminAccess(request: NextRequest) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    console.error('Supabase client not configured')
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  const user = await getCurrentUserServer(supabase)
  
  if (!user) {
    return corsResponse({ error: 'Unauthorized' }, 401)
  }

  // Check if user has admin role
  const isAdmin = user.user_metadata?.role === 'admin' || user.raw_user_meta_data?.role === 'admin'
  
  if (!isAdmin) {
    return corsResponse({ error: 'Admin access required' }, 403)
  }

  return null // No error
}

// GET /api/admin/prompts - List all custom prompts
export async function GET(request: NextRequest) {
  const adminCheck = await checkAdminAccess(request)
  if (adminCheck) return adminCheck

  try {
    // Use admin service key to bypass RLS entirely
    const { createClient } = require('@supabase/supabase-js')
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY!, // Use service role key
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { searchParams } = new URL(request.url)
    
    const category = searchParams.get('category')
    const active_only = searchParams.get('active_only') === 'true'
    
    // Build query with filters using the service role client
    let query = adminSupabase.from('custom_prompts').select('*')
    
    if (category) {
      query = query.eq('category', category)
    }
    
    if (active_only) {
      query = query.eq('is_active', true)
    }
    
    const { data: prompts, error } = await query.order('created_at', { ascending: false })

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

// POST /api/admin/prompts - Create new custom prompt
export async function POST(request: NextRequest) {
  const adminCheck = await checkAdminAccess(request)
  if (adminCheck) return adminCheck

  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }

    const user = await getCurrentUserServer(supabase)
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await request.json()
    const validatedData = createPromptSchema.parse(body)

    // If setting as default, first remove default from other prompts in same category
    if (validatedData.is_default) {
      const { error: updateError } = await supabase
        .from('custom_prompts')
        .update({ is_default: false })
        .eq('category', validatedData.category)

      if (updateError) {
        console.error('Error updating existing defaults:', updateError)
        return NextResponse.json({ error: 'Failed to update existing defaults' }, { status: 500 })
      }
    }

    const promptData = {
      ...validatedData,
      created_by: user!.id,
      config: validatedData.config || { maxTokens: 16000, temperature: 0.3 }
    }

    const { data: newPrompt, error } = await supabase
      .from('custom_prompts')
      .insert([promptData])
      .select()
      .single()

    if (error) {
      console.error('Error creating custom prompt:', error)
      return corsResponse({ error: 'Failed to create prompt' }, 500)
    }

    return corsResponse({ prompt: newPrompt }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return corsResponse({ 
        error: 'Validation failed', 
        details: error.issues 
      }, 400)
    }

    console.error('Unexpected error:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

// OPTIONS /api/admin/prompts - Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}