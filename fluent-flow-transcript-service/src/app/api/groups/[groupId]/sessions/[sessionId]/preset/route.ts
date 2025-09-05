import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserServer, getSupabaseServer } from '@/lib/supabase/server'

function corsResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function OPTIONS() {
  return corsResponse({})
}

/**
 * GET /api/groups/[groupId]/sessions/[sessionId]/preset
 * Get current preset for session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const { groupId, sessionId } = await params

    // Check if user is member of the group
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Get session settings
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('settings')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    const settings = session.settings as any
    const currentPreset = settings?.currentPreset || null

    return corsResponse({
      currentPreset
    })
  } catch (error) {
    console.error('Session preset GET error:', error)
    return corsResponse({ error: 'Failed to get session preset' }, 500)
  }
}

/**
 * PUT /api/groups/[groupId]/sessions/[sessionId]/preset
 * Update current preset for session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const { groupId, sessionId } = await params
    const body = await request.json()
    const { preset } = body

    // Check if user is member of the group
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Get current session settings
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('settings')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    const currentSettings = (session.settings as any) || {}

    // Update settings with new preset
    const updatedSettings = {
      ...currentSettings,
      currentPreset: preset
    }

    // Update session settings
    const { error: updateError } = await supabase
      .from('group_quiz_sessions')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('group_id', groupId)

    if (updateError) {
      throw updateError
    }

    return corsResponse({
      success: true,
      currentPreset: preset
    })
  } catch (error) {
    console.error('Session preset PUT error:', error)
    return corsResponse({ error: 'Failed to update session preset' }, 500)
  }
}