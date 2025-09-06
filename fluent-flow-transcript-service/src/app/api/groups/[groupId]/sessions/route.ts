import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { corsHeaders, corsResponse } from '../../../../../lib/cors'
import { getCurrentUserServer, getSupabaseServer } from '../../../../../lib/supabase/server'
import { PermissionManager } from '../../../../../lib/permissions'
import { notificationService } from '../../../../../lib/services/notification-service'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(
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
    const url = new URL(request.url)
    const status = url.searchParams.get('status') // filter by status

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

    // Build query for sessions
    let query = supabase
      .from('group_quiz_sessions')
      .select(
        `
        id,
        quiz_title,
        video_title,
        scheduled_at,
        started_at,
        ended_at,
        status,
        created_by,
        session_type,
        share_token,
        quiz_token,
        created_at
      `
      )
      .eq('group_id', groupId)

    // Apply status filter if provided
    if (status && ['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: sessions, error: sessionsError } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (sessionsError) {
      console.error('Error fetching group sessions:', sessionsError)
      return corsResponse({ error: 'Failed to fetch sessions' }, 500)
    }

    // Get participant counts for each session
    const sessionIds = sessions?.map(s => s.id) || []
    const { data: participantCounts } = await supabase
      .from('group_session_participants')
      .select('session_id')
      .in('session_id', sessionIds)

    const participantCountMap =
      participantCounts?.reduce((acc: Record<string, number>, p) => {
        acc[p.session_id] = (acc[p.session_id] || 0) + 1
        return acc
      }, {}) || {}

    // Helper function to check if session is likely expired
    const isLikelyExpired = (session: any) => {
      // Only check active/scheduled sessions
      if (!['scheduled', 'active'].includes(session.status)) return false
      
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
      
      if (session.session_type === 'instant') {
        // For instant sessions: expired after 24h from creation time
        if (!session.created_at) return false
        const createdTime = new Date(session.created_at)
        return createdTime < twentyFourHoursAgo
      } else {
        // For scheduled sessions: expired after 24h from scheduled time
        if (!session.scheduled_at) return false
        const scheduledTime = new Date(session.scheduled_at)
        return scheduledTime < twentyFourHoursAgo
      }
    }

    // Format sessions with participant counts and expired status
    const formattedSessions =
      sessions?.map(session => ({
        id: session.id,
        title: session.quiz_title,
        video_title: session.video_title,
        status: session.status,
        session_type: session.session_type,
        scheduled_at: session.scheduled_at,
        started_at: session.started_at,
        ended_at: session.ended_at,
        created_by: session.created_by,
        created_at: session.created_at,
        share_token: session.share_token,
        quiz_token: session.quiz_token,
        participant_count: participantCountMap[session.id] || 0,
        questions_count: 0, // Can be populated from questions_data if needed
        is_likely_expired: isLikelyExpired(session) // Add expired status
      })) || []

    return corsResponse({
      sessions: formattedSessions,
      total: formattedSessions.length
    })
  } catch (error) {
    console.error('Error in group sessions GET:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
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
    const body = await request.json()
    const {
      title,
      scheduledAt,
      questions,
      shareToken,
      loopData,
      notifyMembers = false,
      sessionType = 'scheduled'
    } = body

    // Get user membership and group settings for permission checking
    const { data: membershipData, error: membershipError } = await supabase
      .from('study_group_members')
      .select(`
        role,
        study_groups!inner(
          id,
          name,
          user_role:role,
          created_by,
          settings
        )
      `)
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membershipData) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Use PermissionManager to check session creation permission
    const group = {
      ...membershipData.study_groups,
      user_role: membershipData.role
    }
    const permissions = new PermissionManager(user, group, null)

    if (!permissions.canCreateSessions()) {
      return corsResponse({ error: 'You do not have permission to create sessions in this group' }, 403)
    }

    // Check maxConcurrentSessions limit
    const maxConcurrentSessions = (group as any).settings?.maxConcurrentSessions || 5
    const { count: activeSessions } = await supabase
      .from('group_quiz_sessions')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId)
      .in('status', ['scheduled', 'active'])

    if (activeSessions && activeSessions >= maxConcurrentSessions) {
      return corsResponse({ 
        error: `Maximum concurrent sessions limit reached (${maxConcurrentSessions}). Please complete or cancel existing sessions before creating new ones.` 
      }, 400)
    }

    // Check if session approval is required
    const requiresApproval = (group as any).settings?.requireSessionApproval || false
    const initialStatus = requiresApproval 
      ? 'pending'
      : (scheduledAt ? 'scheduled' : 'active')

    // Use group data from membership query
    const groupData = group

    const sessionId = uuidv4()
    let finalShareToken = shareToken
    const questionsData = questions
    const _loopData = loopData

    // If no shareToken provided but questions/loop provided, create new shared question set
    if (!shareToken && questions && loopData) {
      finalShareToken = uuidv4()
      const shareId = uuidv4()

      const sharedQuestionSet = {
        id: shareId,
        shareToken: finalShareToken,
        title: title || `${loopData.videoTitle} - Group Session`,
        videoTitle: loopData.videoTitle,
        videoUrl: loopData.videoUrl,
        startTime: loopData.startTime,
        endTime: loopData.endTime,
        questions: questions.questions || questions,
        vocabulary: questions.vocabulary || [],
        transcript: questions.transcript || null,
        metadata: {
          totalQuestions: (questions.questions || questions).length,
          createdAt: new Date().toISOString(),
          sharedBy: user.email || 'FluentFlow User',
          difficulty: 'mixed' as const,
          topics: []
        },
        isPublic: false, // Group sessions are private
        shareUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3838'}/questions/${finalShareToken}?groupId=${groupId}&sessionId=${sessionId}`,
        sessions: [],
        groupContext: {
          groupId,
          sessionId,
          groupName: (groupData as any).name,
          isGroupSession: true,
          createdBy: user.id
        }
      }

      // Store in database
      const { error: questionSetError } = await supabase.from('shared_question_sets').insert({
        share_token: finalShareToken,
        title: sharedQuestionSet.title,
        video_title: sharedQuestionSet.videoTitle,
        video_url: sharedQuestionSet.videoUrl,
        start_time: sharedQuestionSet.startTime,
        end_time: sharedQuestionSet.endTime,
        questions: sharedQuestionSet.questions,
        vocabulary: sharedQuestionSet.vocabulary,
        transcript: sharedQuestionSet.transcript,
        metadata: sharedQuestionSet.metadata,
        is_public: sharedQuestionSet.isPublic,
        created_by: user.id,
        group_id: groupId,
        session_id: sessionId
      })

      if (questionSetError) {
        console.error('Failed to store question set in database:', questionSetError)
        // Continue execution - don't fail the request if database storage fails
      }
    }

    // Create database record for group session
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .insert({
        id: sessionId,
        group_id: groupId,
        quiz_token: finalShareToken || sessionId, // Use share token or session ID for backward compatibility
        quiz_title: title || 'Group Quiz Session',
        video_title: _loopData?.videoTitle || null,
        scheduled_at: scheduledAt || new Date().toISOString(),
        created_by: user.id,
        status: initialStatus,
        session_type: sessionType,
        share_token: finalShareToken,
        questions_data: questionsData,
        loop_data: _loopData
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating group session:', sessionError)
      return corsResponse({ error: 'Failed to create group session' }, 500)
    }

    // Send notifications if requested
    if (notifyMembers) {
      try {
        // Get all group members' emails
        const { data: groupMembers } = await supabase
          .from('study_group_members')
          .select(`
            users!inner(email)
          `)
          .eq('group_id', groupId)

        const memberEmails = groupMembers?.map(member => (member.users as any).email).filter(email => email) || []
        
        if (memberEmails.length > 0) {
          await notificationService.sendSessionNotification({
            recipientEmails: memberEmails,
            groupName: (groupData as any).name || 'Study Group',
            sessionTitle: title || 'Group Quiz Session',
            sessionUrl: finalShareToken
              ? `${process.env.NEXTAUTH_URL || 'http://localhost:3838'}/questions/${finalShareToken}?groupId=${groupId}&sessionId=${sessionId}`
              : `${process.env.NEXTAUTH_URL || 'http://localhost:3838'}/groups/${groupId}`,
            scheduledAt: scheduledAt
          })
          console.log(`✅ Sent session notifications to ${memberEmails.length} members`)
        }
      } catch (notificationError) {
        console.error('Failed to send session notifications:', notificationError)
        // Don't fail the request if notifications fail
      }
    }

    const message = requiresApproval 
      ? 'Group session created successfully and is pending approval from administrators.'
      : 'Group session created successfully'

    return corsResponse({
      message,
      requiresApproval,
      session: {
        id: session.id,
        title: session.quiz_title,
        share_token: finalShareToken,
        share_url: finalShareToken
          ? `${process.env.NEXTAUTH_URL || 'http://localhost:3838'}/questions/${finalShareToken}?groupId=${groupId}&sessionId=${sessionId}`
          : null,
        status: session.status,
        scheduled_at: session.scheduled_at
      }
    })
  } catch (error) {
    console.error('Error creating group session:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}
