import { NextRequest, NextResponse } from 'next/server'
import { createSharedQuestionsService } from '../../../../lib/services/shared-questions-service'
import { corsResponse, corsHeaders } from '../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(request: NextRequest) {
  try {
    const questionsService = createSharedQuestionsService(request)
    
    // Get count of expired questions without deleting them
    const { data: expiredCount, error } = await (questionsService as any).request
      ? (questionsService as any).request
      : null
    
    // For now, just return cleanup info
    return corsResponse({
      message: 'Cleanup endpoint ready',
      endpoint: '/api/admin/cleanup-expired-questions',
      method: 'POST to run cleanup job'
    })

  } catch (error) {
    console.error('Failed to check cleanup status:', error)
    return corsResponse({ error: 'Failed to check cleanup status' }, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const questionsService = createSharedQuestionsService(request)
    const deletedCount = await questionsService.deleteExpiredQuestionSets()

    console.log(`Cleanup job completed: ${deletedCount} expired question sets deleted`)

    return corsResponse({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} expired question sets`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cleanup job failed:', error)
    return corsResponse({ error: 'Cleanup job failed' }, 500)
  }
}