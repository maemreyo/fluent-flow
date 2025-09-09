import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = getSupabaseServer(request)
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get detailed transcript data for loops in this group
    const { data: sessions, error } = await supabase
      .from('practice_sessions')
      .select(`
        id,
        video_id,
        video_title,
        video_url,
        created_at,
        updated_at,
        user_id,
        metadata,
        loop_segments!inner (
          id,
          start_time,
          end_time,
          transcript_id,
          label,
          description,
          transcript_metadata,
          transcripts (
            id,
            full_text,
            segments,
            language,
            created_at
          )
        )
      `)
      .eq('status', 'active')
      .eq('user_id', user.id)
      .or(`metadata->>groupId.eq.${groupId},metadata->>savedLoop.neq.null`)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch debug data: ${error.message}`)
    }

    // Transform to debug format
    const debugData = sessions.map(session => {
      const segment = session.loop_segments[0]
      const transcript = Array.isArray(segment?.transcripts)
        ? segment.transcripts[0]
        : segment?.transcripts

      return {
        sessionId: session.id,
        videoId: session.video_id,
        videoTitle: session.video_title,
        createdAt: session.created_at,
        segment: {
          id: segment?.id,
          transcriptId: segment?.transcript_id,
          startTime: segment?.start_time,
          endTime: segment?.end_time
        },
        transcript: transcript ? {
          id: transcript.id,
          hasFullText: !!transcript.full_text,
          fullTextLength: transcript.full_text?.length || 0,
          hasSegments: Array.isArray(transcript.segments) && transcript.segments.length > 0,
          segmentCount: Array.isArray(transcript.segments) ? transcript.segments.length : 0,
          language: transcript.language,
          transcriptCreatedAt: transcript.created_at
        } : null,
        metadata: session.metadata
      }
    })

    return NextResponse.json({ 
      groupId,
      userId: user.id,
      totalLoops: debugData.length,
      loopsWithTranscript: debugData.filter(d => d.transcript?.hasFullText).length,
      loopsWithoutTranscript: debugData.filter(d => !d.transcript?.hasFullText).length,
      debugData
    })

  } catch (error) {
    console.error('Debug API failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch debug data' },
      { status: 500 }
    )
  }
}