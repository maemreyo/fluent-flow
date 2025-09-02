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
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Update participant status to offline or remove record
    const { error: leaveError } = await supabase
      .from('session_participants')
      .update({
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', user.id)

    if (leaveError) {
      console.error('Error leaving session:', leaveError)
      return corsResponse({ error: 'Failed to leave session' }, 500)
    }

    return corsResponse({
      message: 'Successfully left quiz room'
    })

  } catch (error) {
    console.error('Error in leave session POST:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}