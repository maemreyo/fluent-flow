import { NextRequest, NextResponse } from 'next/server'
import { corsResponse, corsHeaders } from '../../../../lib/cors'
import { getSupabaseServiceRole } from '../../../../lib/supabase/service-role'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const url = new URL(request.url)
    const groupId = url.searchParams.get('groupId')
    const sessionId = url.searchParams.get('sessionId')

    if (!token) {
      return corsResponse(
        { error: 'Token is required' },
        400
      )
    }

    console.log(`Looking for token: ${token}`)
    console.log(`Group context: groupId=${groupId}, sessionId=${sessionId}`)

    // Get question set from database only
    const supabase = getSupabaseServiceRole()
    let questionSet = null
    
    if (!supabase) {
      return corsResponse(
        { error: 'Database not configured' },
        500
      )
    }

    try {
      const { data, error } = await supabase
        .from('shared_question_sets')
        .select('*')
        .eq('share_token', token)
        .single()

      if (!error && data) {
        questionSet = data
        console.log(`Found question set in database for token: ${token}`)
      } else {
        console.log(`Database lookup failed for token: ${token}:`, error?.message || 'Not found')
      }
    } catch (error) {
      console.log(`Database lookup failed for token: ${token}:`, error)
    }

    if (!questionSet) {
      console.log(`Token ${token} not found in database or memory`)
      return corsResponse(
        { error: 'Questions not found or expired' },
        404
      )
    }

    // Calculate expiration info from database
    const expiresAt = new Date(questionSet.expires_at)
    const now = new Date()
    const msRemaining = expiresAt.getTime() - now.getTime()
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
    
    const expirationInfo = {
      expiresAt: questionSet.expires_at,
      hoursRemaining: Math.max(0, hoursRemaining),
      minutesRemaining: Math.max(0, minutesRemaining),
      isExpired: msRemaining <= 0
    }

    // BLOCK ACCESS if expired
    if (expirationInfo.isExpired) {
      console.log(`Session ${token} is expired. Blocking access.`)
      return corsResponse(
        { 
          error: 'This quiz session has expired',
          isExpired: true,
          expiredAt: questionSet.expires_at,
          message: 'This session has expired and is no longer available. Please request a new session from the organizer.'
        },
        410 // 410 Gone - indicates the resource is no longer available
      )
    }

    console.log(`Session valid. Expires in: ${expirationInfo?.hoursRemaining}h ${expirationInfo?.minutesRemaining}m`)

    // Add group context if provided
    let groupContext = null
    if (groupId && sessionId) {
      // Get session settings for per-member shuffle
      let sessionSettings = null
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('group_quiz_sessions')
          .select('settings, status')
          .eq('id', sessionId)
          .single()

        if (sessionData) {
          sessionSettings = sessionData.settings || {}
          
          // Also check if the group session itself is expired/cancelled
          if (sessionData.status === 'cancelled') {
            return corsResponse(
              { 
                error: 'This group session has been cancelled',
                isCancelled: true,
                message: 'This group session has been cancelled by the organizer.'
              },
              410
            )
          }
        }
      } catch (error) {
        console.log('Failed to get session settings:', error)
      }

      groupContext = {
        groupId,
        sessionId,
        isGroupSession: true,
        participantCount: 0, // TODO: Get real participant count from database
        canSeeOthersProgress: false, // Future feature
        settings: sessionSettings || {}
      }
    }

    // Format response from database
    return corsResponse({
      id: questionSet.id,
      shareToken: questionSet.share_token,
      title: questionSet.title,
      videoTitle: questionSet.video_title,
      videoUrl: questionSet.video_url,
      startTime: questionSet.start_time,
      endTime: questionSet.end_time,
      questions: questionSet.questions,
      vocabulary: questionSet.vocabulary,
      transcript: questionSet.transcript,
      metadata: questionSet.metadata,
      isPublic: questionSet.is_public,
      expirationInfo,
      groupContext,
      source: 'database' // For debugging
    })

  } catch (error) {
    console.error('Failed to get shared questions:', error)
    return corsResponse(
      { error: 'Failed to load questions' },
      500
    )
  }
}