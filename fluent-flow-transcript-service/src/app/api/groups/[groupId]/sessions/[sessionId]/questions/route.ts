import { NextRequest } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'
import { createSharedQuestionsService } from '@/lib/services/shared-questions-service'
import { corsResponse } from '@/lib/cors'

export async function OPTIONS() {
  return corsResponse({})
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  try {
    const { groupId, sessionId } = await params
    const supabase = getSupabaseServer(request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      return corsResponse({ error: 'Authentication required' }, 401)
    }

    // Get questions for this session by difficulty
    const { data: questionSets, error } = await supabase!
      .from('shared_question_sets')
      .select('*')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch session questions:', error)
      return corsResponse({ error: 'Failed to fetch questions' }, 500)
    }

    // Group by difficulty if metadata contains difficulty info
    const questionsByDifficulty: Record<string, any> = {}
    let totalQuestions = 0

    questionSets?.forEach(set => {
      const difficulty = set.metadata?.difficulty || 'mixed'
      const questionsCount = set.questions?.length || 0
      
      questionsByDifficulty[difficulty] = {
        shareToken: set.share_token,
        count: questionsCount,
        questions: set.questions
      }
      
      totalQuestions += questionsCount
    })

    return corsResponse({
      success: true,
      data: {
        questionsByDifficulty,
        totalQuestions,
        sessionId,
        groupId
      }
    })
  } catch (error) {
    console.error('Failed to get session questions:', error)
    return corsResponse(
      { error: error instanceof Error ? error.message : 'Failed to get session questions' },
      500
    )
  }
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