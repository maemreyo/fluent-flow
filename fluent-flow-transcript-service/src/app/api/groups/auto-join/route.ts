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
    const { groupId } = body

    if (!groupId) {
      return corsResponse({ error: 'Group ID is required' }, 400)
    }

    // Find group by ID
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return corsResponse({ error: 'Group not found' }, 404)
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('study_group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return corsResponse({ 
        message: 'Already a member of this group',
        alreadyMember: true,
        group: {
          id: group.id,
          name: group.name,
          description: group.description
        }
      })
    }

    // Check if group is private and has restricted access
    if (group.is_private) {
      // For private groups via session links, we'll allow auto-join but check group settings
      const requiresApproval = group.settings?.requireApprovalForJoining || false
      
      if (requiresApproval) {
        return corsResponse({ 
          error: 'This private group requires approval to join. Please use the group code or contact an administrator.',
          requiresApproval: true
        }, 403)
      }
    }

    // Check if group is full
    const { count: memberCount } = await supabase
      .from('study_group_members')
      .select('*', { count: 'exact' })
      .eq('group_id', group.id)

    if (memberCount && memberCount >= group.max_members) {
      return corsResponse({ error: 'Group is full' }, 400)
    }

    // Auto-join the group
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
      console.error('Error auto-joining group:', joinError)
      return corsResponse({ error: 'Failed to join group automatically' }, 500)
    }

    return corsResponse({ 
      message: 'Successfully joined group automatically',
      group: {
        id: group.id,
        name: group.name,
        description: group.description
      }
    })
  } catch (error) {
    console.error('Error in auto-join group:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}