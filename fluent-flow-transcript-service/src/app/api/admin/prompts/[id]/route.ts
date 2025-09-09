import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserServer, getSupabaseServer } from '@/lib/supabase/server'
import { corsResponse, corsHeaders } from '@/lib/cors'

// Request validation schema
const updatePromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().optional(),
  category: z.enum([
    'listening_comprehension',
    'detail_focused', 
    'inference_implication',
    'tone_analysis',
    'vocabulary_context',
    'language_function',
    'general'
  ]).optional(),
  system_prompt: z.string().min(10, 'System prompt is required').optional(),
  user_template: z.string().min(10, 'User template is required').optional(),
  config: z.object({
    maxTokens: z.number().min(1000).max(64000).optional(),
    temperature: z.number().min(0).max(2).optional()
  }).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional()
})

// Check if user is admin
async function checkAdminAccess(request: NextRequest) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
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

// GET /api/admin/prompts/[id] - Get specific prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkAdminAccess(request)
  if (adminCheck) return adminCheck

  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }
    
    const { id } = await params

    const { data: prompt, error } = await supabase
      .from('custom_prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return corsResponse({ error: 'Prompt not found' }, 404)
      }
      console.error('Error fetching custom prompt:', error)
      return corsResponse({ error: 'Failed to fetch prompt' }, 500)
    }

    return corsResponse({ prompt })
  } catch (error) {
    console.error('Unexpected error:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

// PUT /api/admin/prompts/[id] - Update specific prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkAdminAccess(request)
  if (adminCheck) return adminCheck

  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }
    
    const { id } = await params
    const body = await request.json()
    const validatedData = updatePromptSchema.parse(body)

    // If setting as default, first get the category and remove default from other prompts
    if (validatedData.is_default) {
      // Get the current prompt's category
      const { data: currentPrompt } = await supabase
        .from('custom_prompts')
        .select('category')
        .eq('id', id)
        .single()

      if (currentPrompt) {
        const categoryToUpdate = validatedData.category || currentPrompt.category

        // Remove default from other prompts in same category
        const { error: updateError } = await supabase
          .from('custom_prompts')
          .update({ is_default: false })
          .eq('category', categoryToUpdate)
          .neq('id', id)

        if (updateError) {
          return corsResponse({ error: 'Failed to update existing defaults' }, 500)
        }
      }
    }

    const { data: updatedPrompt, error } = await supabase
      .from('custom_prompts')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return corsResponse({ error: 'Prompt not found' }, 404)
      }
      console.error('Error updating custom prompt:', error)
      return corsResponse({ error: 'Failed to update prompt' }, 500)
    }

    return corsResponse({ prompt: updatedPrompt })
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

// DELETE /api/admin/prompts/[id] - Delete specific prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkAdminAccess(request)
  if (adminCheck) return adminCheck

  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }
    
    const { id } = await params

    // First check if this is the default prompt for its category
    const { data: promptToDelete } = await supabase
      .from('custom_prompts')
      .select('category, is_default')
      .eq('id', id)
      .single()

    if (promptToDelete?.is_default) {
      // Don't allow deleting default prompts, require setting another as default first
      return corsResponse({ 
        error: 'Cannot delete default prompt. Set another prompt as default first.' 
      }, 400)
    }

    const { error } = await supabase
      .from('custom_prompts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting custom prompt:', error)
      return corsResponse({ error: 'Failed to delete prompt' }, 500)
    }

    return corsResponse({ message: 'Prompt deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

// OPTIONS /api/admin/prompts/[id] - Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}