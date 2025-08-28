import { NextRequest, NextResponse } from 'next/server'
import { sharedQuestions } from '../../../../lib/shared-storage'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

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

    if (!token) {
      return corsResponse(
        { error: 'Token is required' },
        400
      )
    }

    console.log(`Looking for token: ${token}`)
    console.log(`Available tokens:`, Array.from(sharedQuestions.keys()))
    console.log(`Storage size:`, sharedQuestions.size)
    
    const questionSet = sharedQuestions.get(token)

    if (!questionSet) {
      console.log(`Token ${token} not found in storage`)
      return corsResponse(
        { error: 'Questions not found or expired' },
        404
      )
    }

    console.log(`Found question set for token: ${token}`)

    return corsResponse(questionSet)

  } catch (error) {
    console.error('Failed to get shared questions:', error)
    return corsResponse(
      { error: 'Failed to load questions' },
      500
    )
  }
}