import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../../../../lib/cors'
import { PermissionManager } from '../../../../../../../lib/permissions'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(
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

    // Get user membership and group settings for permission checking
    const { data: membershipData, error: membershipError } = await supabase
      .from('study_group_members')
      .select(`
        role,
        study_groups!inner(
          id,
          name,
          user_role:role,
          created_by,
          settings
        )
      `)
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membershipData) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Use PermissionManager to check permission
    const group = {
      ...membershipData.study_groups,
      user_role: membershipData.role
    }
    const permissions = new PermissionManager(user, group, null)

    if (!permissions.canManageSession()) {
      return corsResponse({ error: 'You do not have permission to approve sessions' }, 403)
    }

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    if (session.status !== 'pending') {
      return corsResponse({ error: 'Session is not pending approval' }, 400)
    }

    // Determine new status based on timing
    const now = new Date()
    const scheduledTime = session.scheduled_at ? new Date(session.scheduled_at) : null
    const newStatus = scheduledTime && scheduledTime > now ? 'scheduled' : 'active'

    // Update session status
    const { error: updateError } = await supabase
      .from('group_quiz_sessions')
      .update({
        status: newStatus,
        started_at: newStatus === 'active' ? now.toISOString() : null
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error approving session:', updateError)
      return corsResponse({ error: 'Failed to approve session' }, 500)
    }

    return corsResponse({
      message: 'Session approved successfully',
      status: newStatus
    })
  } catch (error) {
    console.error('Error in session approval:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}