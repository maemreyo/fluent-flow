import { NextRequest } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

function corsResponse(data: any, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function OPTIONS() {
  return corsResponse({})
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
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

    const { groupId, sessionId } = await params
    const body = await request.json()

    // Check if user is member of the group
    const { data: membership, error: memberError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    // Calculate results from the submitted data
    const { responses, questions, setIndex, difficulty, userData } = body
    
    let correctAnswers = 0
    let totalQuestions = questions.length
    let timeTaken = 0 // You might want to track this in the frontend
    
    const detailedResults = responses.map((response: any) => {
      const question = questions.find((_: any, idx: number) => idx === response.questionIndex % questions.length)
      const isCorrect = question && question.correctAnswer === response.answer
      
      if (isCorrect) correctAnswers++

      return {
        questionId: question?.id || `q_${response.questionIndex}`,
        question: question?.question || 'Unknown question',
        userAnswer: response.answer,
        correctAnswer: question?.correctAnswer,
        isCorrect: !!isCorrect,
        explanation: question?.explanation || 'No explanation available.',
        points: isCorrect ? 1 : 0
      }
    })

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    // Insert/update group quiz results
    const { data: existingResult } = await supabase
      .from('group_quiz_results')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    const resultData = {
      session_id: sessionId,
      user_id: user.id,
      score,
      total_questions: totalQuestions,
      time_taken: timeTaken,
      answers_data: {
        responses,
        detailedResults,
        setIndex,
        difficulty
      },
      completed_at: new Date().toISOString()
    }

    let result
    if (existingResult) {
      // Update existing result
      const { data, error } = await supabase
        .from('group_quiz_results')
        .update(resultData)
        .eq('id', existingResult.id)
        .select()
        .single()
      
      result = data
      if (error) throw error
    } else {
      // Insert new result
      const { data, error } = await supabase
        .from('group_quiz_results')
        .insert(resultData)
        .select()
        .single()
      
      result = data
      if (error) throw error
    }

    // Return formatted results similar to individual quiz
    const finalResults = {
      sessionId: `group_${sessionId}`,
      score,
      totalQuestions,
      correctAnswers,
      results: detailedResults,
      submittedAt: new Date().toISOString(),
      setIndex,
      difficulty,
      userData: userData || { userId: user.id, email: user.email },
      // Additional group context
      groupId,
      groupSessionId: sessionId, // Renamed to avoid duplicate
      isGroupQuiz: true
    }

    return corsResponse({
      success: true,
      result,
      formattedResults: finalResults
    })

  } catch (error) {
    console.error('Error submitting group quiz results:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}