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
  { params }: { params: Promise<{ groupId: string; userId: string }> }
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

    const { groupId, userId } = await params
    const body = await request.json()
    const { action, newRole } = body

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

    if (!permissions.canManageMembers()) {
      return corsResponse({ error: 'You do not have permission to manage members' }, 403)
    }

    // Get target member info
    const { data: targetMember, error: targetError } = await supabase
      .from('study_group_members')
      .select('role, user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (targetError || !targetMember) {
      return corsResponse({ error: 'Member not found' }, 404)
    }

    // Prevent self-actions that could lock out the user
    if (user.id === userId) {
      if (action === 'remove' || (action === 'changeRole' && newRole !== 'owner')) {
        return corsResponse({ error: 'Cannot perform this action on yourself' }, 400)
      }
    }

    // Prevent demoting the group owner
    if (targetMember.role === 'owner' && action !== 'remove') {
      return corsResponse({ error: 'Cannot change the role of the group owner' }, 400)
    }

    // Handle different actions
    switch (action) {
      case 'changeRole': {
        if (!newRole || !['member', 'admin', 'owner'].includes(newRole)) {
          return corsResponse({ error: 'Invalid role specified' }, 400)
        }

        // Check maxAdminCount for promotions to admin
        if (newRole === 'admin' && targetMember.role !== 'admin') {
          const maxAdmins = (group as any).settings?.maxAdminCount || 3
          const { count: currentAdminCount } = await supabase
            .from('study_group_members')
            .select('*', { count: 'exact' })
            .eq('group_id', groupId)
            .eq('role', 'admin')

          if (currentAdminCount && currentAdminCount >= maxAdmins) {
            return corsResponse({ 
              error: `Maximum admin limit reached (${maxAdmins}). Demote another admin first.` 
            }, 400)
          }
        }

        // Update member role
        const { error: updateError } = await supabase
          .from('study_group_members')
          .update({ role: newRole })
          .eq('group_id', groupId)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating member role:', updateError)
          return corsResponse({ error: 'Failed to update member role' }, 500)
        }

        return corsResponse({
          message: `Member role updated to ${newRole}`,
          newRole
        })
      }

      case 'remove': {
        // Remove member from group
        const { error: removeError } = await supabase
          .from('study_group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userId)

        if (removeError) {
          console.error('Error removing member:', removeError)
          return corsResponse({ error: 'Failed to remove member' }, 500)
        }

        return corsResponse({
          message: 'Member removed from group'
        })
      }

      default:
        return corsResponse({ error: 'Invalid action specified' }, 400)
    }
  } catch (error) {
    console.error('Error managing group member:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  // Redirect DELETE requests to PATCH with remove action
  const body = { action: 'remove' }
  const patchRequest = new NextRequest(request.url, {
    method: 'PATCH',
    headers: request.headers,
    body: JSON.stringify(body)
  })
  
  return PATCH(patchRequest, { params })
}