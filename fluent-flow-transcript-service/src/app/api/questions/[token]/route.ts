import { NextRequest, NextResponse } from 'next/server'
import { sharedQuestions, sharedSessions } from '../../../../lib/shared-storage'
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

    // Try database first using service role client (public access)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PLASMO_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY || process.env.PLASMO_PUBLIC_SERVICE_ROLE_KEY
    
    let questionSet = null
    let fromDatabase = false
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      try {
        const { data, error } = await supabase
          .from('shared_question_sets')
          .select('*')
          .eq('share_token', token)
          .single()

        if (!error && data) {
          questionSet = data
          fromDatabase = true
          console.log(`Found question set in database for token: ${token}`)
        } else {
          console.log(`Database lookup failed for token: ${token}:`, error?.message || 'Not found')
        }
      } catch (error) {
        console.log(`Database lookup failed for token: ${token}, trying in-memory:`, error)
      }
    }

    // Fallback to in-memory storage for backward compatibility
    if (!questionSet) {
      console.log(`Available in-memory tokens:`, sharedQuestions.keys())
      console.log(`Storage size:`, sharedQuestions.size())
      
      // First try enhanced shared sessions (with auth data)
      const sharedSessionData = sharedSessions.getWithAuth(token)
      let authData = null
      
      if (sharedSessionData) {
        console.log(`Found enhanced session data for token: ${token}`)
        questionSet = sharedSessionData.data
        authData = sharedSessionData.authData
      } else {
        // Fallback to regular shared questions
        questionSet = sharedQuestions.get(token)
      }

      if (questionSet) {
        console.log(`Found question set in memory for token: ${token}`)
        // Add authData to the response for backward compatibility
        questionSet.authData = authData
      }
    }

    if (!questionSet) {
      console.log(`Token ${token} not found in database or memory`)
      return corsResponse(
        { error: 'Questions not found or expired' },
        404
      )
    }

    // Calculate expiration info
    let expirationInfo = null
    if (fromDatabase) {
      const expiresAt = new Date(questionSet.expires_at)
      const now = new Date()
      const msRemaining = expiresAt.getTime() - now.getTime()
      const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60))
      const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
      
      expirationInfo = {
        expiresAt: questionSet.expires_at,
        hoursRemaining: Math.max(0, hoursRemaining),
        minutesRemaining: Math.max(0, minutesRemaining),
        isExpired: msRemaining <= 0
      }
    } else {
      // Use in-memory expiration info
      expirationInfo = sharedQuestions.getExpirationInfo(token)
    }

    console.log(`Expires in: ${expirationInfo?.hoursRemaining}h ${expirationInfo?.minutesRemaining}m`)

    // Add group context if provided
    let groupContext = null
    if (groupId && sessionId) {
      groupContext = {
        groupId,
        sessionId,
        isGroupSession: true,
        participantCount: 0, // TODO: Get real participant count from database
        canSeeOthersProgress: false // Future feature
      }
    }

    // Format response based on data source
    if (fromDatabase) {
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
    } else {
      // Legacy format for in-memory data
      return corsResponse({
        ...questionSet,
        expirationInfo,
        groupContext,
        source: 'memory' // For debugging
      })
    }

  } catch (error) {
    console.error('Failed to get shared questions:', error)
    return corsResponse(
      { error: 'Failed to load questions' },
      500
    )
  }
}