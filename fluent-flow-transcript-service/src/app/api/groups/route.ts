import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../lib/cors'

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
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'my-groups'

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
        return corsResponse({ error: 'Unauthorized' }, 401)
    }

    let groups = []

    if (type === 'my-groups') {
      // First get the group IDs where user is a member
      const { data: membershipData } = await supabase
        .from('study_group_members')
        .select('group_id, role, joined_at')
        .eq('user_id', user.id)

      if (membershipData && membershipData.length > 0) {
        const groupIds = membershipData.map(m => m.group_id)
        
        // Then get the group details
        const { data: groupsData } = await supabase
          .from('study_groups')
          .select('*')
          .in('id', groupIds)
        
        // Combine the data
        groups = groupsData?.map(group => ({
          ...group,
          study_group_members: membershipData.filter(m => m.group_id === group.id)
        })) || []
      }
    } else if (type === 'public') {
      // Get public groups (no need for member info for public view)
      const { data: groupsData } = await supabase
        .from('study_groups')
        .select('*')
        .eq('is_private', false)
      
      groups = groupsData || []
    }

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const { count } = await supabase
          .from('study_group_members')
          .select('*', { count: 'exact' })
          .eq('group_id', group.id)

        return {
          ...group,
          member_count: count || 0
        }
      })
    )

    return corsResponse({ groups: groupsWithCounts })
  } catch (error) {
    console.error('Error in groups API:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
        return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await request.json()
    const { name, description, language, level, is_private, max_members } = body

    // Validation
    if (!name || !language || !level) {
      return corsResponse({ error: 'Name, language, and level are required' }, 400)
    }

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        language,
        level,
        created_by: user.id,
        is_private: is_private || false,
        max_members: max_members || 20
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group:', groupError)
      return corsResponse({ error: groupError.message }, 500)
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'owner'
      })

    if (memberError) {
      console.error('Error adding creator as member:', memberError)
      // Try to cleanup the created group
      await supabase.from('study_groups').delete().eq('id', group.id)
      return corsResponse({ error: 'Failed to create group' }, 500)
    }

    return corsResponse({ 
      message: 'Group created successfully', 
      group: {
        ...group,
        member_count: 1
      }
    })
  } catch (error) {
    console.error('Error in groups POST:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}