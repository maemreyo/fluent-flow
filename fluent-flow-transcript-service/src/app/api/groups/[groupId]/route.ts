import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

    const { groupId } = await params

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return corsResponse({ error: 'Group not found' }, 404)
    }

    // Get group members separately to avoid RLS recursion
    const { data: members } = await supabase
      .from('study_group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    // Get member count
    const { count: memberCount } = await supabase
      .from('study_group_members')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId)

    // Check if current user is a member
    const userMembership = members?.find(m => m.user_id === user.id)

    // Get recent quiz sessions
    const { data: recentSessions, error: sessionsError } = await supabase
      .from('group_quiz_sessions')
      .select(`
        id,
        quiz_title,
        video_title,
        scheduled_at,
        started_at,
        ended_at,
        status,
        created_by
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
    }

    return corsResponse({
      group: {
        ...group,
        member_count: memberCount || 0,
        members: members || [],
        user_role: userMembership?.role || null,
        is_member: !!userMembership,
        recent_sessions: recentSessions || []
      }
    })
  } catch (error) {
    console.error('Error in group GET:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

    const { groupId } = await params
    const body = await request.json()
    const { name, description, is_private, max_members } = body

    // Check if user is owner/admin
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Update group
    const { data: updatedGroup, error: updateError } = await supabase
      .from('study_groups')
      .update({
        name: name?.trim(),
        description: description?.trim(),
        is_private,
        max_members,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating group:', updateError)
      return corsResponse({ error: updateError.message }, 500)
    }

    return corsResponse({ 
      message: 'Group updated successfully', 
      group: updatedGroup 
    })
  } catch (error) {
    console.error('Error in group PUT:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

    const { groupId } = await params

    // Check if user is owner
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (groupError || group.created_by !== user.id) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Delete group (cascades to members, sessions, etc.)
    const { error: deleteError } = await supabase
      .from('study_groups')
      .delete()
      .eq('id', groupId)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return corsResponse({ error: deleteError.message }, 500)
    }

    return corsResponse({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Error in group DELETE:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}