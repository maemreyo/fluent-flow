import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    // Get user's groups with member count for extension dropdown
    const { data: memberships, error: membershipError } = await supabase
      .from('study_group_members')
      .select(`
        role,
        study_groups!inner (
          id,
          name,
          description,
          is_private,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })

    if (membershipError) {
      console.error('Error fetching user groups:', membershipError)
      return corsResponse({ error: 'Failed to fetch groups' }, 500)
    }

    // Get member counts for each group
    const groupIds = memberships?.map((m: any) => m.study_groups.id) || []
    const { data: memberCounts } = await supabase
      .from('study_group_members')
      .select('group_id')
      .in('group_id', groupIds)

    // Count members per group
    const memberCountMap = memberCounts?.reduce((acc: Record<string, number>, member) => {
      acc[member.group_id] = (acc[member.group_id] || 0) + 1
      return acc
    }, {}) || {}

    // Format response for extension
    const groups = memberships?.map(membership => {
      const group = membership.study_groups as any
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        role: membership.role,
        member_count: memberCountMap[group.id] || 0,
        is_private: group.is_private,
        created_at: group.created_at
      }
    }) || []

    return corsResponse({
      groups,
      total: groups.length
    })
  } catch (error) {
    console.error('Error in user groups GET:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}