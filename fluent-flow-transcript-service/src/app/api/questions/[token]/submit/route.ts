import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { sharedQuestions } from '../../../../../lib/shared-storage'

// Helper function to check answers and calculate score
function checkAnswers(questions: any[], responses: any[]) {
  const results = responses.map((response, index) => {
    const question = questions[index]
    const isCorrect = response.answer === question.correctAnswer
    
    return {
      questionId: question.id || `q_${index}`,
      question: question.question,
      userAnswer: response.answer,
      correctAnswer: question.correctAnswer,
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
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await request.json()
    const { responses } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Valid responses array is required' },
        { status: 400 }
      )
    }

    const questionSet = sharedQuestions.get(token)

    if (!questionSet) {
      return NextResponse.json(
        { error: 'Questions not found or expired' },
        { status: 404 }
      )
    }

    // Check answers and calculate score
    const evaluation = checkAnswers(questionSet.questions, responses)
    
    // Create session
    const sessionId = uuidv4()
    const session = {
      id: sessionId,
      token,
      submittedAt: new Date().toISOString(),
      responses,
      evaluation,
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
      submittedAt: session.submittedAt
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Failed to submit answers:', error)
    return NextResponse.json(
      { error: 'Failed to submit answers' },
      { status: 500 }
    )
  }
}