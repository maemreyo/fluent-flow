import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string, sessionId: string }> }
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

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select(`
        id,
        quiz_title,
        video_title,
        scheduled_at,
        started_at,
        ended_at,
        status,
        created_by,
        session_type,
        share_token,
        questions_data,
        loop_data,
        created_at
      `)
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from('group_session_participants')
      .select(`
        user_id,
        joined_at,
        completed_at,
        score
      `)
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true })

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
    }

    // Check if current user can join (member and session is active)
    const canJoin = session.status === 'active' || session.status === 'scheduled'
    
    // Generate share URL if token exists
    const shareUrl = session.share_token ? 
      `${process.env.NEXTAUTH_URL || 'http://localhost:3838'}/questions/${session.share_token}?groupId=${groupId}&sessionId=${sessionId}` : 
      null

    return corsResponse({
      session: {
        id: session.id,
        title: session.quiz_title,
        video_title: session.video_title,
        status: session.status,
        session_type: session.session_type,
        scheduled_at: session.scheduled_at,
        started_at: session.started_at,
        ended_at: session.ended_at,
        created_by: session.created_by,
        created_at: session.created_at,
        share_token: session.share_token,
        share_url: shareUrl,
        questions_data: session.questions_data,
        loop_data: session.loop_data
      },
      participants: participants || [],
      canJoin,
      shareUrl
    })
  } catch (error) {
    console.error('Error in session GET:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string, sessionId: string }> }
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
    const { scheduledAt, status, title, description } = body

    // Check if user is owner/admin or session creator
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Get session to check ownership
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('created_by')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    // Check permissions: owner, admin, or session creator
    const canModify = ['owner', 'admin'].includes(membership.role) || session.created_by === user.id

    if (!canModify) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Build update object
    const updateData: any = {}
    if (scheduledAt !== undefined) updateData.scheduled_at = scheduledAt
    if (status !== undefined) updateData.status = status
    if (title !== undefined) updateData.quiz_title = title
    updateData.updated_at = new Date().toISOString()

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('group_quiz_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return corsResponse({ error: 'Failed to update session' }, 500)
    }

    return corsResponse({
      message: 'Session updated successfully',
      session: updatedSession
    })
  } catch (error) {
    console.error('Error in session PUT:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string, sessionId: string }> }
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

    // Check if user is owner/admin or session creator
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Get session to check ownership
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('created_by')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    // Check permissions: owner, admin, or session creator
    const canDelete = ['owner', 'admin'].includes(membership.role) || session.created_by === user.id

    if (!canDelete) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Delete session (participants will be deleted via cascade)
    const { error: deleteError } = await supabase
      .from('group_quiz_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('group_id', groupId)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return corsResponse({ error: 'Failed to delete session' }, 500)
    }

    return corsResponse({ message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Error in session DELETE:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}