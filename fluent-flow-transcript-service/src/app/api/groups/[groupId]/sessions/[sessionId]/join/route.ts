import { NextRequest } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

function corsResponse(data: any, status = 200) {
  return Response.json(data, {
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

    // Check if user is member of the group
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role, username, avatar, user_email')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return corsResponse({ error: 'Access denied - not a group member' }, 403)
    }

    // Check if session exists and belongs to the group
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('id, status, scheduled_at')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    // Check if session is available for joining
    if (session.status === 'completed' || session.status === 'cancelled') {
      return corsResponse({ error: 'Session is no longer available' }, 400)
    }

    // Insert or update participant record
    const { data: participant, error: participantError } = await supabase
      .from('session_participants')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        is_online: true,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      })
      .select()

    if (participantError) {
      console.error('Error joining session:', participantError)
      return corsResponse({ error: 'Failed to join session' }, 500)
    }

    return corsResponse({
      message: 'Successfully joined quiz room',
      participant: {
        session_id: sessionId,
        user_id: user.id,
        username: membership.username,
        avatar: membership.avatar,
        user_email: membership.user_email,
        joined_at: new Date().toISOString(),
        is_online: true
      }
    })

  } catch (error) {
    console.error('Error in join session POST:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}