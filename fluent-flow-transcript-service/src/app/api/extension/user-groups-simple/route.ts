import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders, corsResponse } from '../../../../lib/cors'
import { getSupabaseServiceRole } from '../../../../lib/supabase/service-role'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(request: NextRequest) {
  // Use service role client to bypass RLS for this public endpoint
  const supabase = getSupabaseServiceRole()
  
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const body = await request.json()
    const { userEmail } = body

    if (!userEmail) {
      return corsResponse({ error: 'userEmail is required' }, 400)
    }

    console.log(`Fetching groups for email: ${userEmail}`)

    // Find user by email in profiles table (using service role to bypass RLS)
    console.log(`Querying profiles table for: ${userEmail.toLowerCase().trim()}`)
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', userEmail.toLowerCase().trim())
      .single()

    if (userError || !user) {
      console.error('User lookup error:', userError)
      console.log('User data:', user)
      return corsResponse(
        {
          error: 'User not found. Please make sure you have an account with this email.'
        },
        404
      )
    }

    console.log(`Found user: ${user.id} - ${user.email}`)

    // Get user's groups
    const { data: memberships, error: membershipError } = await supabase
      .from('study_group_members')
      .select(
        `
        role,
        study_groups (
          id,
          name,
          description,
          is_private
        )
      `
      )
      .eq('user_id', user.id)

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError)
      return corsResponse({ error: 'Failed to fetch user groups' }, 500)
    }

    // Format the response and get member counts
    const groups = []
    if (memberships) {
      for (const membership of memberships) {
        // Get member count for this group
        const { count: memberCount } = await supabase
          .from('study_group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', membership.study_groups.id)

        groups.push({
          id: membership.study_groups.id,
          name: membership.study_groups.name,
          description: membership.study_groups.description,
          is_private: membership.study_groups.is_private,
          member_count: memberCount || 0,
          role: membership.role
        })
      }
    }

    console.log(`Found ${groups.length} groups for user ${userEmail}`)

    return corsResponse({
      groups,
      total: groups.length,
      user: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Error fetching user groups:', error)
    return corsResponse({ error: 'Failed to fetch user groups' }, 500)
  }
}
