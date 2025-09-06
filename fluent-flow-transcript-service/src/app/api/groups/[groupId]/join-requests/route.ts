import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../../lib/cors'
import { PermissionManager } from '../../../../../lib/permissions'

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
      return corsResponse({ error: 'You do not have permission to view join requests' }, 403)
    }

    // Fetch pending join requests
    const { data: joinRequests, error: requestsError } = await supabase
      .from('group_join_requests')
      .select(`
        id,
        user_email,
        username,
        status,
        requested_at,
        processed_at,
        processed_by,
        rejection_reason
      `)
      .eq('group_id', groupId)
      .order('requested_at', { ascending: false })

    if (requestsError) {
      console.error('Error fetching join requests:', requestsError)
      return corsResponse({ error: 'Failed to fetch join requests' }, 500)
    }

    return corsResponse({
      joinRequests: joinRequests || [],
      total: joinRequests?.length || 0
    })
  } catch (error) {
    console.error('Error in join requests GET:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}