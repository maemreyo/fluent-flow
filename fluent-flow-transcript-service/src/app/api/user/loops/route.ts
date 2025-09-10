import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'
import { LoopManagementService } from '@/lib/services/loop-management-service'
import { corsResponse, corsHeaders } from '@/lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }
    
    // Get current user
    const user = await getCurrentUserServer(supabase)
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    // Get user's loops (not tied to any specific group)
    const service = new LoopManagementService(request)
    const loops = await service.getUserLoops(user.id)

    return corsResponse({ loops })
  } catch (error) {
    console.error('Error fetching user loops:', error)
    return corsResponse(
      { error: 'Failed to fetch loops' },
      500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer(request)
    if (!supabase) {
      return corsResponse({ error: 'Database not configured' }, 500)
    }
    
    // Get current user
    const user = await getCurrentUserServer(supabase)
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const body = await request.json()
    const { videoUrl, videoTitle, videoId, startTime, endTime, transcript, segments, language, metadata } = body

    // Validate required fields
    if (!videoUrl || !videoId || startTime === undefined || endTime === undefined) {
      return corsResponse(
        { error: 'Missing required fields: videoUrl, videoId, startTime, endTime' },
        400
      )
    }

    // Create the loop
    const service = new LoopManagementService(request)
    const loop = await service.createUserLoop({
      userId: user.id,
      videoUrl,
      videoTitle: videoTitle || 'YouTube Video',
      videoId,
      startTime,
      endTime,
      transcript: transcript || '',
      segments: segments || [],
      language: language || 'auto',
      metadata: metadata || {}
    })

    return corsResponse({ loop })
  } catch (error) {
    console.error('Error creating user loop:', error)
    return corsResponse(
      { error: 'Failed to create loop' },
      500
    )
  }
}