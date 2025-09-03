import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(
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

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }
    
    // Check for expired sessions by trying to fetch their questions
    const { data: sessions, error: fetchError } = await supabase
      .from('group_quiz_sessions')
      .select('id, quiz_token, status')
      .eq('group_id', groupId)
      .in('status', ['scheduled', 'active'])

    if (fetchError) {
      console.error('Error fetching sessions:', fetchError)
      return corsResponse({ error: 'Failed to fetch sessions' }, 500)
    }

    const expiredSessionIds: string[] = []
    
    // Check each session's questions endpoint
    for (const session of sessions || []) {
      if (session.quiz_token) {
        try {
          const questionsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3838'}/api/questions/${session.quiz_token}`,
            { method: 'GET' }
          )
          
          if (questionsResponse.status === 410) {
            // Session is expired
            expiredSessionIds.push(session.id)
          }
        } catch (error) {
          console.error(`Error checking session ${session.id}:`, error)
          // If we can't check, assume it might be expired
          expiredSessionIds.push(session.id)
        }
      }
    }

    // Update expired sessions to 'completed' status
    if (expiredSessionIds.length > 0) {
      const { error: updateError } = await supabase
        .from('group_quiz_sessions')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', expiredSessionIds)

      if (updateError) {
        console.error('Error updating expired sessions:', updateError)
        return corsResponse({ error: 'Failed to update expired sessions' }, 500)
      }
    }

    return corsResponse({
      message: `Updated ${expiredSessionIds.length} expired sessions`,
      expiredSessionIds
    })

  } catch (error) {
    console.error('Error in expired sessions check:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}