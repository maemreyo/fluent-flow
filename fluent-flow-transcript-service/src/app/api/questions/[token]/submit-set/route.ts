import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { sharedQuestions } from '../../../../../lib/shared-storage'
import { corsResponse, corsHeaders } from '../../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

// Helper function to check answers for a specific set
function checkSetAnswers(questions: any[], responses: any[]) {
  const results = responses.map((response, index) => {
    const question = questions[index]
    const isCorrect = response.answer === question.correctAnswer
    
    // Convert option letter back to full text for display
    const userOptionIndex = response.answer.charCodeAt(0) - 65 // A->0, B->1, etc.
    const correctOptionIndex = question.correctAnswer.charCodeAt(0) - 65
    const userAnswerText = question.options[userOptionIndex] || response.answer
    const correctAnswerText = question.options[correctOptionIndex] || question.correctAnswer
    
    return {
      questionId: question.id || `q_${index}`,
      question: question.question,
      userAnswer: userAnswerText,
      correctAnswer: correctAnswerText,
      isCorrect,
      explanation: question.explanation || 'No explanation available.',
      points: isCorrect ? 1 : 0
    }
  })

  const totalQuestions = questions.length
  const correctAnswers = results.filter(r => r.isCorrect).length
  const score = Math.round((correctAnswers / totalQuestions) * 100)

  return { results, score, totalQuestions, correctAnswers }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { responses, questions, setIndex, difficulty } = body

    if (!token) {
      return corsResponse(
        { error: 'Token is required' },
        400
      )
    }

    if (!responses || !Array.isArray(responses) || !questions || !Array.isArray(questions)) {
      return corsResponse(
        { error: 'Valid responses and questions arrays are required' },
        400
      )
    }

    const questionSet = sharedQuestions.get(token)

    if (!questionSet) {
      return corsResponse(
        { error: 'Questions not found or expired' },
        404
      )
    }

    // Check answers for this set only
    const evaluation = checkSetAnswers(questions, responses)
    
    // Create session for this set
    const sessionId = uuidv4()
    const session = {
      id: sessionId,
      token,
      submittedAt: new Date().toISOString(),
      responses,
      evaluation,
      setIndex,
      difficulty,
      userAgent: request.headers.get('user-agent') || 'Unknown'
    }

    // Store session in questionSet
    if (!questionSet.sessions) {
      questionSet.sessions = []
    }
    questionSet.sessions.push(session)

    // Update the stored data
    sharedQuestions.set(token, questionSet)

    const result = {
      sessionId,
      score: evaluation.score,
      totalQuestions: evaluation.totalQuestions,
      correctAnswers: evaluation.correctAnswers,
      results: evaluation.results,
      submittedAt: session.submittedAt,
      setIndex,
      difficulty
    }

    return corsResponse(result)

  } catch (error) {
    console.error('Failed to submit set answers:', error)
    return corsResponse(
      { error: 'Failed to submit set answers' },
      500
    )
  }
}