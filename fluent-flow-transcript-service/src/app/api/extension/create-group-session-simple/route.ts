import { NextRequest, NextResponse } from 'next/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'
import { getSupabaseServiceRole } from '../../../../lib/supabase/service-role'
import { v4 as uuidv4 } from 'uuid'

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
    const { questions, loop, vocabulary, transcript, groupId, userEmail, options = {} } = body

    if (!questions || !loop || !groupId || !userEmail) {
      return corsResponse({ 
        error: 'Questions, loop data, groupId, and userEmail are required' 
      }, 400)
    }

    console.log(`Creating group session for email: ${userEmail}, group: ${groupId}`)

    // Find user by email in profiles table (using service role to bypass RLS)
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', userEmail.toLowerCase().trim())
      .single()

    if (userError || !user) {
      return corsResponse({ 
        error: 'User not found. Please make sure you have an account and the email is correct.' 
      }, 404)
    }

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return corsResponse({ 
        error: 'You are not a member of this group. Please join the group first.' 
      }, 403)
    }

    // Get group info
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('name')
      .eq('id', groupId)
      .single()

    if (groupError) {
      return corsResponse({ error: 'Group not found' }, 404)
    }

    const sessionId = uuidv4()
    const shareToken = uuidv4()
    
    // Create database record for group session FIRST (to satisfy foreign key constraint)
    const { data: groupSession, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .insert({
        id: sessionId,
        group_id: groupId,
        quiz_token: shareToken,
        quiz_title: options.title || `${loop.videoTitle} - Group Session`,
        video_title: loop.videoTitle,
        scheduled_at: options.scheduledAt || new Date().toISOString(),
        created_by: user.id,
        status: options.scheduledAt ? 'scheduled' : 'active',
        session_type: 'instant',
        share_token: shareToken,
        questions_data: {
          questions: questions.questions,
          vocabulary,
          transcript
        },
        loop_data: loop
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating group session:', sessionError)
      return corsResponse({ error: 'Failed to create group session' }, 500)
    }

    // Now create shared question set (referencing the existing session)
    const { data: sharedQuestionSet, error: createError } = await supabase
      .from('shared_question_sets')
      .insert({
        id: uuidv4(),
        share_token: shareToken,
        title: options.title || `${loop.videoTitle} - Group Session`,
        video_title: loop.videoTitle,
        video_url: loop.videoUrl,
        start_time: loop.startTime,
        end_time: loop.endTime,
        questions: questions.questions,
        vocabulary: vocabulary || [],
        transcript: transcript || null,
        is_public: false, // Group sessions are private
        group_id: groupId,
        session_id: sessionId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        created_by: user.id,
        metadata: {
          sharedBy: options.sharedBy || userEmail,
          difficulty: 'mixed',
          topics: questions.questions
            .map((q: any) => q.type)
            .filter((t: any, i: number, arr: any[]) => arr.indexOf(t) === i),
          groupName: group.name,
          isGroupSession: true,
          createdBy: user.id,
          createdViaExtension: true
        }
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating shared question set:', createError)
      return corsResponse({ error: 'Failed to create shared question set' }, 500)
    }

    console.log(`Group session created successfully: ${sessionId}`)

    // Generate share URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3838'
    const shareUrl = groupId 
      ? `${baseUrl}/questions/${shareToken}?group=${groupId}&session=${sessionId}`
      : `${baseUrl}/questions/${shareToken}`

    return corsResponse({
      shareToken: shareToken,
      shareUrl: shareUrl,
      sessionId,
      groupId,
      expiresAt: sharedQuestionSet.expires_at,
      expirationMessage: 'Expires in 24h (Group sessions last longer)',
      group: {
        name: group.name
      },
      user: {
        email: user.email
      }
    })
  } catch (error) {
    console.error('Error creating group session:', error)
    return corsResponse({ error: 'Failed to create group session' }, 500)
  }
}