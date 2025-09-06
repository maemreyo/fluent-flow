import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../../../lib/cors'
import { PermissionManager } from '../../../../../../lib/permissions'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; requestId: string }> }
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

    const { groupId, requestId } = await params
    const body = await request.json()
    const { action, rejectionReason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return corsResponse({ error: 'Invalid action. Must be "approve" or "reject"' }, 400)
    }

    // Get user membership and group settings for permission checking
    const { data: membershipData, error: membershipError } = await supabase
      .from('study_group_members')
      .select(`
        role,
        study_groups!inner(
          id,
          name,
          max_members,
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

    if (!permissions.canManageMembers()) {
      return corsResponse({ error: 'You do not have permission to manage join requests' }, 403)
    }

    // Get the join request
    const { data: joinRequest, error: requestError } = await supabase
      .from('group_join_requests')
      .select('*')
      .eq('id', requestId)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .single()

    if (requestError || !joinRequest) {
      return corsResponse({ error: 'Join request not found or already processed' }, 404)
    }

    if (action === 'approve') {
      // Check if group is full
      const { count: memberCount } = await supabase
        .from('study_group_members')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId)

      if (memberCount && memberCount >= (membershipData.study_groups as any).max_members) {
        return corsResponse({ error: 'Group is full' }, 400)
      }

      // Start transaction-like operations
      // 1. Add user to group
      const { error: joinError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: joinRequest.user_id,
          user_email: joinRequest.user_email,
          username: joinRequest.username,
          role: 'member'
        })

      if (joinError) {
        console.error('Error adding user to group:', joinError)
        return corsResponse({ error: 'Failed to add user to group' }, 500)
      }

      // 2. Update join request status
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Error updating join request status:', updateError)
        // Note: User is already added to group, so we don't fail here
      }

      return corsResponse({
        message: 'Join request approved successfully',
        action: 'approved'
      })
    } else {
      // Reject the request
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          rejection_reason: rejectionReason || null
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Error updating join request status:', updateError)
        return corsResponse({ error: 'Failed to reject join request' }, 500)
      }

      return corsResponse({
        message: 'Join request rejected successfully',
        action: 'rejected'
      })
    }
  } catch (error) {
    console.error('Error processing join request:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}