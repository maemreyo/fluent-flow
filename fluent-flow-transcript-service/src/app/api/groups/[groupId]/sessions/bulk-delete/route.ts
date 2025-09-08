import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, corsResponse } from '../../../../../../lib/cors'
import { getCurrentUserServer, getSupabaseServer } from '../../../../../../lib/supabase/server'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    console.log('🔍 Bulk delete auth check:', { hasUser: !!user, userId: user?.id })
    
    if (!user) {
      console.log('❌ Bulk delete: No authenticated user found')
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const { groupId } = await params
    const { sessionIds } = await request.json()

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return corsResponse({ error: 'Invalid session IDs provided' }, 400)
    }

    // Check if user has permission to manage sessions in this group
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    console.log('🔍 Bulk delete membership check:', { 
      hasData: !!membership, 
      role: membership?.role, 
      memberError: memberError?.message 
    })

    if (memberError || !membership) {
      console.log('❌ Bulk delete: Access denied - no membership found')
      return corsResponse({ error: 'Access denied' }, 403)
    }

    const canManage = ['owner', 'admin', 'moderator', 'teacher'].includes(membership.role)
    console.log('🔍 Bulk delete permission check:', { 
      userRole: membership.role, 
      canManage, 
      requiredRoles: ['owner', 'admin', 'moderator', 'teacher'] 
    })
    
    if (!canManage) {
      console.log('❌ Bulk delete: Insufficient permissions')
      return corsResponse({ 
        error: `Insufficient permissions. Required roles: owner, admin, moderator, or teacher. Your role: ${membership.role}` 
      }, 403)
    }

    console.log(`🗑️ Bulk deleting ${sessionIds.length} sessions for group ${groupId}`)

    // Verify all sessions belong to the group and get session details
    const { data: sessionsToDelete, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('id, quiz_title, status, created_at')
      .eq('group_id', groupId)
      .in('id', sessionIds)

    if (sessionError) {
      console.error('Error fetching sessions to delete:', sessionError)
      return corsResponse({ error: 'Failed to verify sessions' }, 500)
    }

    if (!sessionsToDelete || sessionsToDelete.length !== sessionIds.length) {
      return corsResponse({ 
        error: 'Some sessions not found or do not belong to this group' 
      }, 400)
    }

    // Check for active sessions - prevent deletion of currently running sessions
    const activeSessions = sessionsToDelete.filter(s => s.status === 'active')
    if (activeSessions.length > 0) {
      return corsResponse({ 
        error: `Cannot delete active sessions: ${activeSessions.map(s => s.quiz_title).join(', ')}`,
        activeSessions: activeSessions.map(s => ({ id: s.id, name: s.quiz_title }))
      }, 400)
    }

    // Start transaction for bulk delete
    // Note: Supabase handles CASCADE deletes automatically based on foreign key constraints
    // This will delete related records in the following order:
    // 1. group_quiz_progress (CASCADE)
    // 2. group_quiz_results (CASCADE) 
    // 3. group_session_participants (CASCADE)
    // 4. session_participants (CASCADE)
    // 5. progress_events (CASCADE)
    // 6. shared_question_sets.session_id will be SET NULL (preserves questions for reuse)

    const { error: deleteError } = await supabase
      .from('group_quiz_sessions')
      .delete()
      .in('id', sessionIds)

    if (deleteError) {
      console.error('Error during bulk delete:', deleteError)
      return corsResponse({ error: 'Failed to delete sessions' }, 500)
    }

    console.log(`✅ Successfully bulk deleted ${sessionIds.length} sessions and related data`)

    // Return success with summary
    return corsResponse({
      success: true,
      message: `Successfully deleted ${sessionIds.length} sessions`,
      deletedSessions: sessionsToDelete.map(s => ({
        id: s.id,
        name: s.quiz_title,
        status: s.status,
        createdAt: s.created_at
      })),
      summary: {
        totalDeleted: sessionIds.length,
        cascadeDeletes: [
          'Quiz progress records',
          'Quiz results', 
          'Session participants',
          'Progress events'
        ],
        preserved: [
          'Questions (unlinked from sessions but preserved for reuse)',
          'Study group data',
          'User profiles'
        ]
      }
    })

  } catch (error) {
    console.error('Bulk delete error:', error)
    return corsResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500)
  }
}