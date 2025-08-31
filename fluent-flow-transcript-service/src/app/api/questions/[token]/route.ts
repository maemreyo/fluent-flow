import { NextRequest, NextResponse } from 'next/server'
import { sharedQuestions, sharedSessions } from '../../../../lib/shared-storage'
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
    console.log(`Available tokens:`, sharedQuestions.keys())
    console.log(`Storage size:`, sharedQuestions.size())
    
    // First try to get from enhanced shared sessions (with auth data)
    const sharedSessionData = sharedSessions.getWithAuth(token)
    let questionSet = null
    let authData = null
    
    if (sharedSessionData) {
      console.log(`Found enhanced session data for token: ${token}`)
      questionSet = sharedSessionData.data
      authData = sharedSessionData.authData
    } else {
      // Fallback to regular shared questions for backward compatibility
      questionSet = sharedQuestions.get(token)
    }

    if (!questionSet) {
      console.log(`Token ${token} not found in storage or expired`)
      return corsResponse(
        { error: 'Questions not found or expired' },
        404
      )
    }

    // Get expiration info
    const expirationInfo = sharedQuestions.getExpirationInfo(token)
    
    console.log(`Found question set for token: ${token}`)
    console.log(`Auth data available: ${!!authData}`)
    console.log(`Expires in: ${expirationInfo?.hoursRemaining}h ${expirationInfo?.minutesRemaining}m`)

    return corsResponse({
      ...questionSet,
      authData, // Include authentication data if available
      expirationInfo
    })

  } catch (error) {
    console.error('Failed to get shared questions:', error)
    return corsResponse(
      { error: 'Failed to load questions' },
      500
    )
  }
}