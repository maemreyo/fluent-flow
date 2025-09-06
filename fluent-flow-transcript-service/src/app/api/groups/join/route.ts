import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
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
    const { code } = body

    if (!code) {
      return corsResponse({ error: 'Group code is required' }, 400)
    }

    // Find group by code
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('*')
      .eq('group_code', code.toUpperCase())
      .single()

    if (groupError || !group) {
      return corsResponse({ error: 'Invalid group code' }, 404)
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return corsResponse({ error: 'You are already a member of this group' }, 400)
    }

    // Check if there's already a pending join request
    const { data: existingRequest } = await supabase
      .from('group_join_requests')
      .select('id, status')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingRequest) {
      return corsResponse({ error: 'You already have a pending join request for this group' }, 400)
    }

    // Check if group is full
    const { count: memberCount } = await supabase
      .from('study_group_members')
      .select('*', { count: 'exact' })
      .eq('group_id', group.id)

    if (memberCount && memberCount >= group.max_members) {
      return corsResponse({ error: 'Group is full' }, 400)
    }

    // Check if approval is required for joining
    const requiresApproval = group.settings?.requireApprovalForJoining || false

    if (requiresApproval) {
      // Create a join request for approval
      const { error: requestError } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: group.id,
          user_id: user.id,
          user_email: user.email,
          username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          status: 'pending',
          requested_at: new Date().toISOString()
        })

      if (requestError) {
        console.error('Error creating join request:', requestError)
        return corsResponse({ error: 'Failed to create join request' }, 500)
      }

      return corsResponse({ 
        message: 'Join request submitted successfully. Please wait for approval from group administrators.',
        requiresApproval: true,
        group: {
          id: group.id,
          name: group.name,
          description: group.description
        }
      })
    }

    // Direct join without approval
    const { error: joinError } = await supabase
      .from('study_group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        user_email: user.email,
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'member'
      })

    if (joinError) {
      console.error('Error joining group:', joinError)
      return corsResponse({ error: 'Failed to join group' }, 500)
    }

    return corsResponse({ 
      message: 'Successfully joined group',
      requiresApproval: false,
      group: {
        id: group.id,
        name: group.name,
        description: group.description
      }
    })
  } catch (error) {
    console.error('Error in join group:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}