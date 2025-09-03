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

/**
 * Shuffle array options with seeded randomization for consistent results
 * This ensures the same group session always has the same shuffle pattern
 */
function shuffleOptionsWithSeed(options: string[], seed: string): string[] {
  // Create a simple hash from the seed for consistent randomization
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Create a copy of options to shuffle
  const shuffled = [...options]
  
  // Fisher-Yates shuffle with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate deterministic "random" index based on hash and position
    hash = (hash * 9301 + 49297) % 233280
    const j = Math.abs(hash) % (i + 1)
    
    // Swap elements
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }

  return shuffled
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
    
    // Apply basic answer shuffling to avoid AI bias (level a: fix A-bias)
    const shuffledQuestions = questions.questions.map((q: any, index: number) => {
      // Get the correct option text before shuffling
      const correctAnswerIndex = ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer || 'A')
      const correctOption = q.options[correctAnswerIndex] || q.options[0]
      
      // Create seeded shuffle for consistency
      const seed = `${groupId}-${sessionId}-${index}` // Use group/session/index as seed
      const shuffledOptions = shuffleOptionsWithSeed(q.options, seed)
      
      // Find new position of correct answer
      const newCorrectIndex = shuffledOptions.indexOf(correctOption)
      const newCorrectAnswer = ['A', 'B', 'C', 'D'][newCorrectIndex]
      
      return {
        ...q,
        options: shuffledOptions,
        correctAnswer: newCorrectAnswer
      }
    })

    // Session settings including the new per_member_shuffle option
    const sessionSettings = {
      allowLateJoin: true,
      showRealTimeResults: options.showRealTimeResults || false,
      per_member_shuffle: options.per_member_shuffle || false // Default: false (off)
    }
    
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
        settings: sessionSettings, // Include the new settings
        questions_data: {
          questions: shuffledQuestions, // Use shuffled questions
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
        questions: shuffledQuestions, // Use shuffled questions here too
        vocabulary: vocabulary || [],
        transcript: transcript || null,
        is_public: false, // Group sessions are private
        group_id: groupId,
        session_id: sessionId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        created_by: user.id,
        metadata: {
          sharedBy: options.sharedBy || userEmail,
          difficulty: 'mixed',
          topics: shuffledQuestions
            .map((q: any) => q.type)
            .filter((t: any, i: number, arr: any[]) => arr.indexOf(t) === i),
          groupName: group.name,
          isGroupSession: true,
          createdBy: user.id,
          createdViaExtension: true,
          answersShuffled: true, // Mark that answers were shuffled (level a)
          per_member_shuffle: sessionSettings.per_member_shuffle // Store the setting
        }
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating shared question set:', createError)
      return corsResponse({ error: 'Failed to create shared question set' }, 500)
    }

    console.log(`Group session created successfully: ${sessionId}`)

    // Generate NEW group-focused share URL with tab navigation and session highlighting
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3838'
    const shareUrl = `${baseUrl}/groups/${groupId}?tab=sessions&highlight=${sessionId}`

    return corsResponse({
      shareToken: shareToken,
      shareUrl: shareUrl, // Now points to group page with tab focus
      sessionId,
      groupId,
      expiresAt: sharedQuestionSet.expires_at,
      expirationMessage: 'Expires in 24h (Group sessions last longer)',
      group: {
        name: group.name
      },
      user: {
        email: user.email
      },
      settings: sessionSettings, // Return the session settings
      // Add navigation hints for frontend
      navigation: {
        targetTab: 'sessions',
        highlightSession: sessionId,
        groupPage: `/groups/${groupId}`
      }
    })
  } catch (error) {
    console.error('Error creating group session:', error)
    return corsResponse({ error: 'Failed to create group session' }, 500)
  }
}