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

    // Get session participants with user information
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select(`
        user_id,
        joined_at,
        is_online,
        last_seen
      `)
      .eq('session_id', sessionId)

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
      return corsResponse({ error: 'Failed to fetch participants' }, 500)
    }

    // Get user details for participants
    const userIds = participants?.map(p => p.user_id) || []
    const { data: users, error: usersError } = await supabase
      .from('study_group_members')
      .select('user_id, username, avatar, user_email')
      .eq('group_id', groupId)
      .in('user_id', userIds)

    if (usersError) {
      console.error('Error fetching user details:', usersError)
    }

    // Combine participant data with user information
    const participantsWithUserInfo = participants?.map(participant => {
      const userInfo = users?.find(u => u.user_id === participant.user_id)
      return {
        ...participant,
        username: userInfo?.username,
        avatar: userInfo?.avatar,
        user_email: userInfo?.user_email || 'Unknown'
      }
    }) || []

    return corsResponse({
      participants: participantsWithUserInfo,
      total: participantsWithUserInfo.length,
      online: participantsWithUserInfo.filter(p => p.is_online).length
    })

  } catch (error) {
    console.error('Error in participants GET:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}