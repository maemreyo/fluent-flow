import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }
  const { groupId, sessionId } = await params

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get results for this session
    const { data: results, error: resultsError } = await supabase
      .from('group_quiz_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })

    if (resultsError) {
      console.error('Error fetching results:', resultsError)
      return NextResponse.json({ error: resultsError.message }, { status: 500 })
    }

    // Get user emails from group members for the results
    let transformedResults = results || []
    
    if (results && results.length > 0) {
      const userIds = results.map(r => r.user_id)
      
      // Get user data from study_group_members table
      const { data: members } = await supabase
        .from('study_group_members')
        .select('user_id, username, user_email')
        .eq('group_id', groupId)
        .in('user_id', userIds)
      
      const memberDataMap = new Map(
        members?.map(member => [member.user_id, member]) || []
      )
      
      // Transform results to match frontend expectations
      transformedResults = results.map(result => ({
        ...result,
        user_email: memberDataMap.get(result.user_id)?.user_email || null,
        username: memberDataMap.get(result.user_id)?.username || result.user_name || null
      }))
    }

    // Calculate session statistics
    const stats = {
      total_participants: transformedResults.length,
      average_score: transformedResults.length > 0 
        ? Math.round(transformedResults.reduce((sum, r) => sum + r.score, 0) / transformedResults.length)
        : 0,
      highest_score: transformedResults.length > 0 ? Math.max(...transformedResults.map(r => r.score)) : 0,
      completion_rate: transformedResults.length > 0 
        ? Math.round((transformedResults.filter(r => r.completed_at).length / transformedResults.length) * 100)
        : 0
    }

    return NextResponse.json({ 
      session,
      results: transformedResults,
      stats
    })
  } catch (error) {
    console.error('Error in session results GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }
  const { groupId, sessionId } = await params

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from('study_group_members')
      .select('username')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      score, 
      total_questions, 
      correct_answers, 
      time_taken_seconds, 
      result_data 
    } = body

    // Validation
    if (typeof score !== 'number' || typeof total_questions !== 'number' || typeof correct_answers !== 'number') {
      return NextResponse.json({ error: 'Invalid result data' }, { status: 400 })
    }

    // Insert or update result
    const { data: result, error: resultError } = await supabase
      .from('group_quiz_results')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        user_name: membership.username,
        score,
        total_questions,
        correct_answers,
        time_taken_seconds: time_taken_seconds || null,
        result_data: result_data || {},
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      })
      .select()
      .single()

    if (resultError) {
      console.error('Error saving result:', resultError)
      return NextResponse.json({ error: resultError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Result saved successfully', 
      result 
    })
  } catch (error) {
    console.error('Error in session results POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}