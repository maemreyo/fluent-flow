import { NextRequest, NextResponse } from 'next/server'
import { createSharedQuestionsService } from '@/lib/services/shared-questions-service'
import { getCurrentUserServer, getSupabaseServer } from '@/lib/supabase/server'

function corsResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

export async function OPTIONS() {
  return corsResponse({})
}

/**
 * DELETE /api/groups/[groupId]/sessions/[sessionId]/questions
 * Delete all questions for a specific session
 */
export async function DELETE(
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

    // Delete session questions using the service
    const sharedService = createSharedQuestionsService(request)
    const deletedCount = await sharedService.deleteSessionQuestions(groupId, sessionId)

    return corsResponse({
      success: true,
      message: `Deleted ${deletedCount} question set(s) for session`,
      deletedCount
    })
  } catch (error) {
    console.error('Session question deletion error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return corsResponse({ error: 'Authentication required' }, 401)
      }
      if (error.message.includes('Access denied')) {
        return corsResponse({ error: 'Access denied' }, 403)
      }
    }

    return corsResponse({ error: 'Failed to delete session questions. Please try again.' }, 500)
  }
}
