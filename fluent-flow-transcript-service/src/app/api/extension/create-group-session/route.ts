import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'
import { createSharedQuestionsService } from '../../../../lib/services/shared-questions-service'
import { v4 as uuidv4 } from 'uuid'

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
    // Try server-side authentication first (for web users)
    let user = await getCurrentUserServer(supabase)
    
    // If no user from cookies, try Bearer token authentication (for extension users)
    if (!user) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Verify the token with Supabase
        const { data: tokenUser, error } = await supabase.auth.getUser(token)
        if (!error && tokenUser.user) {
          user = tokenUser.user
          // Set the session for this request
          await supabase.auth.setSession({
            access_token: token,
            refresh_token: token // Use same token as fallback
          })
        }
      }
    }
    
    if (!user) {
      return corsResponse({ error: 'Unauthorized - Please sign in' }, 401)
    }

    const body = await request.json()
    const { questions, loop, vocabulary, transcript, groupId, options = {} } = body

    if (!questions || !loop || !groupId) {
      return corsResponse({ 
        error: 'Questions, loop data, and groupId are required' 
      }, 400)
    }

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
    
    // Create shared question set using new database service
    const questionsService = createSharedQuestionsService(request)
    const sharedQuestionSet = await questionsService.createSharedQuestionSet({
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
      expires_hours: 24, // Group sessions last longer than public shares
      metadata: {
        sharedBy: options.sharedBy || user.email || 'FluentFlow User',
        difficulty: 'mixed',
        topics: questions.questions
          .map((q: any) => q.type)
          .filter((t: any, i: number, arr: any[]) => arr.indexOf(t) === i),
        groupName: group.name,
        isGroupSession: true,
        createdBy: user.id
      }
    })

    // Create database record for group session
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .insert({
        id: sessionId,
        group_id: groupId,
        quiz_token: sharedQuestionSet.share_token, // Link to shared question set
        quiz_title: sharedQuestionSet.title,
        video_title: loop.videoTitle,
        scheduled_at: options.scheduledAt || new Date().toISOString(),
        created_by: user.id,
        status: options.scheduledAt ? 'scheduled' : 'active',
        session_type: 'instant',
        share_token: sharedQuestionSet.share_token,
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

    console.log(`Group session created successfully: ${sessionId}`)
    console.log(`Share token: ${sharedQuestionSet.share_token}`)

    // Generate share URL using the service
    const shareUrl = questionsService.generateShareUrl(
      sharedQuestionSet.share_token, 
      process.env.NEXTAUTH_URL || 'http://localhost:3838',
      groupId,
      sessionId
    )

    // TODO: Send notifications to group members if requested
    if (options.notifyMembers) {
      console.log(`Notifications requested for group session ${sessionId}`)
    }

    return corsResponse({
      shareToken: sharedQuestionSet.share_token,
      shareUrl: shareUrl,
      sessionId,
      groupId,
      expiresAt: sharedQuestionSet.expires_at,
      expirationMessage: 'Expires in 24h (Group sessions last longer)',
      group: {
        name: group.name
      }
    })
  } catch (error) {
    console.error('Error creating group session:', error)
    return corsResponse({ error: 'Failed to create group session' }, 500)
  }
}