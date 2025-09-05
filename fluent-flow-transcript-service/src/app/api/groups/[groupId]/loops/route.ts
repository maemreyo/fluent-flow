import { NextRequest, NextResponse } from 'next/server'
import { createLoopManagementService } from '@/lib/services/loop-management-service'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = getSupabaseServer(request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const service = createLoopManagementService(request)
    const loops = await service.getLoops({ groupId })

    return NextResponse.json({ loops })
  } catch (error) {
    console.error('Failed to fetch loops:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch loops' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const body = await request.json()
    
    const supabase = getSupabaseServer(request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { videoUrl, startTime, endTime, transcript, videoTitle, videoId, segments, language, metadata } = body

    if (!videoUrl || !videoTitle || !videoId || !transcript || !segments) {
      return NextResponse.json(
        { error: 'Missing required fields: videoUrl, videoTitle, videoId, transcript, segments' },
        { status: 400 }
      )
    }

    const service = createLoopManagementService(request)
    const loop = await service.createLoop({
      videoUrl,
      videoTitle,
      videoId,
      startTime: startTime || 0,
      endTime: endTime || 60,
      transcript,
      segments,
      language,
      groupId,
      metadata
    })

    return NextResponse.json({ loop })
  } catch (error) {
    console.error('Failed to create loop:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create loop' },
      { status: 500 }
    )
  }
}