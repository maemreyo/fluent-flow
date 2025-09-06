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

    // Get user membership and verify access
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

    // Get all group members
    const { data: members, error: membersError } = await supabase
      .from('study_group_members')
      .select(`
        user_id,
        role,
        joined_at,
        users!inner(
          email,
          user_metadata
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching group members:', membersError)
      return corsResponse({ error: 'Failed to fetch members' }, 500)
    }

    // Format member data
    const formattedMembers = members?.map(member => ({
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      email: (member.users as any).email,
      username: (member.users as any).user_metadata?.full_name || (member.users as any).email?.split('@')[0] || 'User'
    })) || []

    // Count admins for maxAdminCount validation
    const adminCount = formattedMembers.filter(m => m.role === 'admin').length
    const group = {
      ...membershipData.study_groups,
      user_role: membershipData.role
    }
    const maxAdmins = (group as any).settings?.maxAdminCount || 3

    return corsResponse({
      members: formattedMembers,
      adminCount,
      maxAdmins,
      canPromoteMore: adminCount < maxAdmins
    })
  } catch (error) {
    console.error('Error fetching group members:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}