import { NextRequest, NextResponse } from 'next/server'
import { sharedQuestions } from '../../../../lib/shared-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    return NextResponse.json(questionSet)

  } catch (error) {
    console.error('Failed to get shared questions:', error)
    return NextResponse.json(
      { error: 'Failed to load questions' },
      { status: 500 }
    )
  }
}