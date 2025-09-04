import { supabase } from '../supabase/client'
import { getAuthHeaders } from '../supabase/auth-utils'

export interface ProgressRecord {
  id: string
  session_id: string
  user_id: string
  current_question: number
  current_set: number
  total_answered: number
  correct_answers: number
  time_spent: number
  confidence_level?: 'low' | 'medium' | 'high' | null
  struggling_indicators?: any
  help_requested: boolean
  is_online: boolean
  last_activity: string
  completed: boolean
  created_at: string
  updated_at: string
}

export interface ProgressEvent {
  id: string
  session_id: string
  user_id: string
  event_type: 'question_start' | 'question_answer' | 'question_complete' | 'set_complete' | 'session_complete'
  question_index?: number
  answer?: string
  is_correct?: boolean
  time_spent_seconds?: number
  confidence_level?: 'low' | 'medium' | 'high' | null
  created_at: string
}

export interface SessionParticipant {
  user_id: string
  user_email: string | null
  username?: string | null
  is_online: boolean
  joined_at: string
}

export interface ProgressUpdatePayload {
  currentQuestion: number
  currentSet: number
  totalAnswered: number
  correctAnswers?: number
  answer?: string
  isCorrect?: boolean
  timeSpent?: number
  confidenceLevel?: 'low' | 'medium' | 'high'
  completed?: boolean
}

/**
 * Fetch all session participants with their basic info
 */
export async function fetchSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  // First get the group_id from the session
  const { data: sessionData, error: sessionError } = await supabase
    .from('group_quiz_sessions')
    .select('group_id')
    .eq('id', sessionId)
    .single()

  if (sessionError) throw sessionError
  if (!sessionData?.group_id) throw new Error('Group not found for session')

  // Get session participants with their user info from group members
  const { data, error } = await supabase
    .from('session_participants')
    .select(`
      user_id,
      is_online,
      joined_at,
      last_seen
    `)
    .eq('session_id', sessionId)

  if (error) throw error

  // Get user info from group members
  const userIds = data?.map(p => p.user_id) || []
  if (userIds.length === 0) return []

  const { data: groupMembers, error: membersError } = await supabase
    .from('study_group_members')
    .select('user_id, user_email, username')
    .eq('group_id', sessionData.group_id)
    .in('user_id', userIds)

  if (membersError) throw membersError

  // Combine session participants with group member info
  const enrichedParticipants: SessionParticipant[] = data.map(participant => {
    const memberInfo = groupMembers?.find(m => m.user_id === participant.user_id)
    return {
      user_id: participant.user_id,
      user_email: memberInfo?.user_email || null,
      username: memberInfo?.username || null,
      is_online: participant.is_online,
      joined_at: participant.joined_at
    }
  })

  return enrichedParticipants
}

/**
 * Fetch progress records for a session
 */
export async function fetchSessionProgress(sessionId: string): Promise<ProgressRecord[]> {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  const { data, error } = await supabase
    .from('group_quiz_progress')
    .select('*')
    .eq('session_id', sessionId)
    .order('last_activity', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Check if user has existing results for this session
 */
export async function checkExistingResults(
  groupId: string,
  sessionId: string
): Promise<{ hasResults: boolean; results?: any }> {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  try {
    // First ensure we have a fresh session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      console.warn('No valid session for checking existing results')
      return { hasResults: false }
    }

    const userId = session.user.id

    // Check for completed progress record (after completion logic is fixed)
    // Also check for progress with answers as fallback for testing
    const { data: completedData, error: completedError } = await supabase
      .from('group_quiz_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('completed', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (completedError) {
      console.error('Error checking completed progress:', completedError)
    }

    // If no completed progress found, check for any progress with answers (for testing)
    let progressData = completedData
    if (!completedData) {
      console.log('No completed progress found, checking for any progress with answers...')
      const { data: anyProgressData, error: progressError } = await supabase
        .from('group_quiz_progress')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .gt('total_answered', 0)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (progressError) {
        console.error('Error checking any progress:', progressError)
        throw progressError
      }
      
      progressData = anyProgressData
    }

    console.log('Found progress data:', progressData)

    if (progressData) {
      // Also check if there are actual quiz results saved
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`, {
          headers
        })

        if (response.ok) {
          const data = await response.json()
          const userResults = data.results?.find((r: any) => r.user_id === userId)
          
          if (userResults) {
            return { 
              hasResults: true, 
              results: {
                score: userResults.score,
                totalQuestions: userResults.total_questions,
                correctAnswers: progressData.correct_answers,
                timeSpent: progressData.time_spent,
                completedAt: progressData.last_activity
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch quiz results:', error)
      }

      // Even if no API results, we have progress data
      return { 
        hasResults: true, 
        results: {
          score: progressData.total_answered > 0 
            ? Math.round((progressData.correct_answers / progressData.total_answered) * 100)
            : 0,
          totalQuestions: progressData.total_answered,
          correctAnswers: progressData.correct_answers,
          timeSpent: progressData.time_spent,
          completedAt: progressData.last_activity
        }
      }
    }

    return { hasResults: false }
  } catch (error) {
    console.error('Error in checkExistingResults:', error)
    // Return false instead of throwing to prevent breaking the UI flow
    return { hasResults: false }
  }
}

/**
 * Reset progress record for current user when starting new quiz attempt
 */
export async function resetUserProgress(sessionId: string): Promise<void> {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Delete existing progress record for fresh start
  const { error: deleteError } = await supabase
    .from('group_quiz_progress')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id)

  if (deleteError) throw deleteError
}

/**
 * Update or insert progress record for current user
 */
export async function updateUserProgress(
  sessionId: string, 
  progressUpdate: ProgressUpdatePayload
): Promise<void> {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Upsert progress record
  const { error: upsertError } = await supabase
    .from('group_quiz_progress')
    .upsert({
      session_id: sessionId,
      user_id: user.id,
      current_question: progressUpdate.currentQuestion,
      current_set: progressUpdate.currentSet,
      total_answered: progressUpdate.totalAnswered,
      correct_answers: progressUpdate.correctAnswers || 0,
      time_spent: progressUpdate.timeSpent || 0,
      confidence_level: progressUpdate.confidenceLevel || null,
      completed: progressUpdate.completed || false,
      is_online: true,
      last_activity: new Date().toISOString().slice(0, 19) // Remove timezone for timestamp without timezone
    }, {
      onConflict: 'session_id,user_id'
    })

  if (upsertError) throw upsertError
}

/**
 * Log a progress event
 */
export async function logProgressEvent(
  sessionId: string,
  eventData: {
    event_type: string
    event_data?: any
  }
): Promise<void> {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('progress_events')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      event_type: eventData.event_type,
      event_data: eventData.event_data || {},
      timestamp: new Date().toISOString().slice(0, 19) // timestamp without timezone
    })

  if (error) throw error
}

/**
 * Fetch progress events for analysis
 */
export async function fetchProgressEvents(
  sessionId: string, 
  userId?: string
): Promise<any[]> {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  let query = supabase
    .from('progress_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Submit final group quiz results to leaderboard API
 */
export async function submitGroupQuizResults(
  groupId: string,
  sessionId: string,
  resultsData: {
    score: number
    total_questions: number
    correct_answers: number
    time_taken_seconds?: number | null
    result_data: any
  }
): Promise<void> {
  if (!groupId || !sessionId) throw new Error('Group ID and Session ID are required')

  const headers = await getAuthHeaders()
  
  const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/results`, {
    method: 'POST',
    headers,
    body: JSON.stringify(resultsData)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to submit group quiz results')
  }
}

/**
 * Create a real-time subscription for progress updates
 */
export function createProgressSubscription(
  sessionId: string,
  onProgressChange: (payload: any) => void,
  onParticipantChange: (payload: any) => void
) {
  if (!sessionId) throw new Error('Session ID is required')
  if (!supabase) throw new Error('Supabase client not available')

  return supabase
    .channel(`progress_${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_quiz_progress',
        filter: `session_id=eq.${sessionId}`
      },
      onProgressChange
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`
      },
      onParticipantChange
    )
    .subscribe()
}