import { NextRequest } from 'next/server'
import { getCurrentUserServer, getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseServiceRole } from '@/lib/supabase/service-role'
import type { TablesInsert } from '@/lib/supabase/types'

export interface CreateLoopRequest {
  videoUrl: string
  videoTitle: string
  videoId: string
  startTime: number
  endTime: number
  transcript: string
  segments: TranscriptSegment[]
  language?: string
  groupId?: string
  metadata?: any
}

export interface TranscriptSegment {
  text: string
  start: number
  duration: number
}

export interface Loop {
  id: string
  videoUrl: string
  videoTitle: string
  videoId: string
  startTime: number
  endTime: number
  transcript: string
  segments: TranscriptSegment[]
  language?: string
  groupId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  metadata?: any
}

export interface LoopWithStats extends Loop {
  practiceSessionsCount: number
  questionsCount: number
  lastPracticedAt?: string
}

/**
 * Loop Management Service
 * Handles creation, storage, and management of practice loops with transcript data
 */
export interface CreateUserLoopRequest {
  userId: string
  videoUrl: string
  videoTitle: string
  videoId: string
  startTime: number
  endTime: number
  transcript: string
  segments: TranscriptSegment[]
  language?: string
  metadata?: any
}

export class LoopManagementService {
  constructor(private request?: NextRequest) {}

  /**
   * Create a new loop with transcript data
   */
  async createLoop(data: CreateLoopRequest): Promise<Loop> {
    if (!this.request) {
      throw new Error('Request context required for loop creation')
    }

    const supabase = getSupabaseServer(this.request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      throw new Error('Authentication required')
    }

    try {
      // 1. Create transcript record
      const transcriptInsert: TablesInsert<'transcripts'> = {
        video_id: data.videoId,
        full_text: data.transcript,
        segments: data.segments as any, // Cast to any for JSONB field
        start_time: data.startTime,
        end_time: data.endTime,
        language: data.language || 'en',
        metadata: {
          videoUrl: data.videoUrl,
          videoTitle: data.videoTitle,
          createdBy: user.id,
          ...data.metadata
        }
      }

      const { data: transcriptRecord, error: transcriptError } = await supabase!
        .from('transcripts')
        .insert(transcriptInsert)
        .select()
        .single()

      if (transcriptError) {
        throw new Error(`Failed to create transcript: ${transcriptError.message}`)
      }

      // 2. Create practice session (represents the loop)
      const sessionInsert: TablesInsert<'practice_sessions'> = {
        user_id: user.id,
        video_id: data.videoId,
        video_title: data.videoTitle,
        video_channel: data.metadata?.videoInfo?.channel || 'Unknown Channel',
        video_url: data.videoUrl,
        video_duration: Math.max(1, data.endTime - data.startTime),
        status: 'active',
        metadata: {
          transcriptId: transcriptRecord.id,
          groupId: data.groupId,
          startTime: data.startTime,
          endTime: data.endTime,
          language: data.language,
          segmentCount: data.segments.length,
          savedLoop: {
            id: `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: data.videoTitle,
            description: `Practice segment from ${data.videoTitle}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            hasTranscript: true,
            transcriptMetadata: {
              segmentCount: data.segments.length,
              language: data.language,
              fullTextLength: data.transcript.length
            }
          },
          ...data.metadata
        }
      }

      console.log('Attempting to insert session with data:', JSON.stringify(sessionInsert, null, 2))
      const { data: sessionRecord, error: sessionError } = await supabase!
        .from('practice_sessions')
        .insert(sessionInsert)
        .select()
        .single()

      if (sessionError) {
        throw new Error(`Failed to create practice session: ${sessionError.message}`)
      }

      // 3. Create loop segment linking transcript to session
      const segmentInsert: TablesInsert<'loop_segments'> = {
        session_id: sessionRecord.id,
        start_time: data.startTime,
        end_time: data.endTime,
        transcript_id: transcriptRecord.id,
        has_transcript: true,
        label: `${data.videoTitle} (${data.startTime}s-${data.endTime}s)`,
        description: `Practice segment from ${data.videoTitle}`,
        transcript_metadata: {
          segmentCount: data.segments.length,
          language: data.language,
          fullTextLength: data.transcript.length
        }
      }

      const { data: segmentRecord, error: segmentError } = await supabase!
        .from('loop_segments')
        .insert(segmentInsert)
        .select()
        .single()

      if (segmentError) {
        throw new Error(`Failed to create loop segment: ${segmentError.message}`)
      }

      return {
        id: sessionRecord.id,
        videoUrl: data.videoUrl,
        videoTitle: data.videoTitle,
        videoId: data.videoId,
        startTime: data.startTime,
        endTime: data.endTime,
        transcript: data.transcript,
        segments: data.segments,
        language: data.language,
        groupId: data.groupId,
        createdBy: user.id,
        createdAt: sessionRecord.created_at,
        updatedAt: sessionRecord.updated_at,
        metadata: {
          transcriptId: transcriptRecord.id,
          segmentId: segmentRecord.id,
          ...data.metadata
        }
      }
    } catch (error) {
      console.error('Failed to create loop:', error)
      throw error
    }
  }

  /**
   * Get loops for a user or group
   */
  async getLoops(
    options: {
      userId?: string
      groupId?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<LoopWithStats[]> {
    if (!this.request) {
      throw new Error('Request context required')
    }

    const supabase = getSupabaseServer(this.request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      throw new Error('Authentication required')
    }

    try {
      let query = supabase!
        .from('practice_sessions')
        .select(
          `
          id,
          video_id,
          video_title,
          video_url,
          video_duration,
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
              full_text,
              segments,
              language
            )
          )
        `
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Filter by user or group
      query = query.eq('user_id', options.userId || user.id)

      if (options.groupId) {
        // Look for loops with either groupId in metadata OR savedLoop structure (for sidepanel compatibility)
        query = query.or(
          `metadata->>groupId.eq.${options.groupId},metadata->>savedLoop.neq.null`
        )
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data: sessions, error } = await query

      if (error) {
        throw new Error(`Failed to fetch loops: ${error.message}`)
      }

      // Get session IDs for stats calculation
      const sessionIds = sessions.map(s => s.id)

      // Get practice session counts (from shared_question_sets)
      const { data: practiceStats } = await supabase!
        .from('shared_question_sets')
        .select('session_id')
        .in('session_id', sessionIds)
        .not('session_id', 'is', null)

      // Get question counts from shared_question_sets
      const { data: questionStats } = await supabase!
        .from('shared_question_sets')
        .select('session_id, questions')
        .in('session_id', sessionIds)
        .not('session_id', 'is', null)

      // Create stats maps
      const practiceCountMap = new Map<string, number>()
      practiceStats?.forEach((stat: any) => {
        const count = practiceCountMap.get(stat.session_id) || 0
        practiceCountMap.set(stat.session_id, count + 1)
      })

      const questionCountMap = new Map<string, number>()
      questionStats?.forEach((stat: any) => {
        if (stat.questions && Array.isArray(stat.questions)) {
          const existingCount = questionCountMap.get(stat.session_id) || 0
          questionCountMap.set(stat.session_id, Math.max(existingCount, stat.questions.length))
        }
      })

      // Transform to Loop format with real stats
      const loops: LoopWithStats[] = sessions.map(session => {
        const segment = session.loop_segments[0]
        const transcript = Array.isArray(segment?.transcripts)
          ? segment.transcripts[0]
          : segment?.transcripts

        return {
          id: session.id,
          videoUrl: session.video_url,
          videoTitle: session.video_title,
          videoId: session.video_id,
          startTime: segment?.start_time || 0,
          endTime: segment?.end_time || session.video_duration || 0,
          transcript: transcript?.full_text || '',
          segments: transcript?.segments || [],
          language: transcript?.language,
          groupId: session.metadata?.groupId,
          createdBy: session.user_id,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          metadata: {
            transcriptId: segment?.transcript_id,
            segmentId: segment?.id,
            ...session.metadata
          },
          practiceSessionsCount: practiceCountMap.get(session.id) || 0,
          questionsCount: questionCountMap.get(session.id) || 0
        }
      })

      return loops
    } catch (error) {
      console.error('Failed to fetch loops:', error)
      throw error
    }
  }

  /**
   * Get a specific loop by ID
   */
  async getLoop(loopId: string): Promise<Loop | null> {
    if (!this.request) {
      throw new Error('Request context required')
    }

    const supabase = getSupabaseServer(this.request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      throw new Error('Authentication required')
    }

    try {
      const { data: session, error } = await supabase!
        .from('practice_sessions')
        .select(
          `
          id,
          video_id,
          video_title,
          video_url,
          video_duration,
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
              full_text,
              segments,
              language
            )
          )
        `
        )
        .eq('id', loopId)
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(`Failed to fetch loop: ${error.message}`)
      }

      const segment = session.loop_segments[0]
      const transcript = Array.isArray(segment?.transcripts)
        ? segment.transcripts[0]
        : segment?.transcripts

      return {
        id: session.id,
        videoUrl: session.video_url,
        videoTitle: session.video_title,
        videoId: session.video_id,
        startTime: segment?.start_time || 0,
        endTime: segment?.end_time || session.video_duration || 0,
        transcript: transcript?.full_text || '',
        segments: transcript?.segments || [],
        language: transcript?.language,
        groupId: session.metadata?.groupId,
        createdBy: session.user_id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        metadata: {
          transcriptId: segment?.transcript_id,
          segmentId: segment?.id,
          ...session.metadata
        }
      }
    } catch (error) {
      console.error('Failed to fetch loop:', error)
      throw error
    }
  }

  /**
   * Delete a loop and its associated data
   */
  async deleteLoop(loopId: string): Promise<void> {
    if (!this.request) {
      throw new Error('Request context required')
    }

    const supabase = getSupabaseServer(this.request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      throw new Error('Authentication required')
    }

    try {
      // Get loop to verify ownership
      const loop = await this.getLoop(loopId)
      if (!loop) {
        throw new Error('Loop not found')
      }

      if (loop.createdBy !== user.id) {
        throw new Error('Permission denied: You can only delete your own loops')
      }

      // Delete in reverse order of creation
      // 1. Delete loop segments (will cascade to related data)
      await supabase!.from('loop_segments').delete().eq('session_id', loopId)

      // 2. Delete practice session
      const { error: sessionError } = await supabase!
        .from('practice_sessions')
        .delete()
        .eq('id', loopId)

      if (sessionError) {
        throw new Error(`Failed to delete practice session: ${sessionError.message}`)
      }

      // 3. Delete transcript if no other references
      if (loop.metadata?.transcriptId) {
        const { data: segments } = await supabase!
          .from('loop_segments')
          .select('id')
          .eq('transcript_id', loop.metadata.transcriptId)

        if (!segments || segments.length === 0) {
          await supabase!.from('transcripts').delete().eq('id', loop.metadata.transcriptId)
        }
      }
    } catch (error) {
      console.error('Failed to delete loop:', error)
      throw error
    }
  }

  /**
   * Update loop metadata
   */
  async updateLoop(
    loopId: string,
    updates: {
      videoTitle?: string
      label?: string
      description?: string
      groupId?: string
      metadata?: any
    }
  ): Promise<Loop> {
    if (!this.request) {
      throw new Error('Request context required')
    }

    const supabase = getSupabaseServer(this.request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      throw new Error('Authentication required')
    }

    try {
      // Verify ownership
      const existingLoop = await this.getLoop(loopId)
      if (!existingLoop) {
        throw new Error('Loop not found')
      }

      if (existingLoop.createdBy !== user.id) {
        throw new Error('Permission denied: You can only update your own loops')
      }

      // Update practice session
      const sessionUpdates: any = {}
      if (updates.videoTitle) sessionUpdates.video_title = updates.videoTitle
      if (updates.metadata || updates.groupId) {
        sessionUpdates.metadata = {
          ...existingLoop.metadata,
          ...(updates.groupId && { groupId: updates.groupId }),
          ...updates.metadata
        }
      }

      if (Object.keys(sessionUpdates).length > 0) {
        const { error: sessionError } = await supabase!
          .from('practice_sessions')
          .update(sessionUpdates)
          .eq('id', loopId)

        if (sessionError) {
          throw new Error(`Failed to update practice session: ${sessionError.message}`)
        }
      }

      // Update loop segment if needed
      const segmentUpdates: any = {}
      if (updates.label) segmentUpdates.label = updates.label
      if (updates.description) segmentUpdates.description = updates.description

      if (Object.keys(segmentUpdates).length > 0 && existingLoop.metadata?.segmentId) {
        const { error: segmentError } = await supabase!
          .from('loop_segments')
          .update(segmentUpdates)
          .eq('id', existingLoop.metadata.segmentId)

        if (segmentError) {
          throw new Error(`Failed to update loop segment: ${segmentError.message}`)
        }
      }

      // Return updated loop
      const updatedLoop = await this.getLoop(loopId)
      if (!updatedLoop) {
        throw new Error('Failed to fetch updated loop')
      }

      return updatedLoop
    } catch (error) {
      console.error('Failed to update loop:', error)
      throw error
    }
  }

  /**
   * Create a user loop (not tied to any specific group)
   */
  async createUserLoop(data: CreateUserLoopRequest): Promise<Loop> {
    // Use service role for all operations to bypass RLS policies
    const serviceSupabase = getSupabaseServiceRole()
    if (!serviceSupabase) {
      throw new Error('Service role not configured')
    }
    
    try {
      // 1. Create transcript record using service role to bypass RLS
      const transcriptInsert: TablesInsert<'transcripts'> = {
        video_id: data.videoId,
        full_text: data.transcript,
        segments: data.segments as any, // Cast to any for JSONB field
        start_time: data.startTime,
        end_time: data.endTime,
        language: data.language || 'en',
        metadata: {
          videoUrl: data.videoUrl,
          videoTitle: data.videoTitle,
          createdBy: data.userId,
          ...data.metadata
        }
      }

      const { data: transcriptRecord, error: transcriptError } = await serviceSupabase
        .from('transcripts')
        .insert(transcriptInsert)
        .select()
        .single()

      if (transcriptError) {
        throw new Error(`Failed to create transcript: ${transcriptError.message}`)
      }

      // 2. Create practice session (represents the loop) using service role
      const sessionInsert: TablesInsert<'practice_sessions'> = {
        user_id: data.userId,
        video_id: data.videoId,
        video_title: data.videoTitle,
        video_channel: data.metadata?.videoInfo?.channel || 'Unknown Channel',
        video_url: data.videoUrl,
        video_duration: Math.max(1, data.endTime - data.startTime),
        status: 'active',
        metadata: {
          transcriptId: transcriptRecord.id,
          startTime: data.startTime,
          endTime: data.endTime,
          language: data.language,
          segmentCount: data.segments.length,
          userLoop: true, // Mark as user loop (not tied to group)
          savedLoop: {
            id: `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: data.videoTitle,
            description: `Practice segment from ${data.videoTitle}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            hasTranscript: true,
            transcriptMetadata: {
              segmentCount: data.segments.length,
              language: data.language,
              fullTextLength: data.transcript.length
            }
          },
          ...data.metadata
        }
      }

      const { data: sessionRecord, error: sessionError } = await serviceSupabase
        .from('practice_sessions')
        .insert(sessionInsert)
        .select()
        .single()

      if (sessionError) {
        throw new Error(`Failed to create practice session: ${sessionError.message}`)
      }

      // 3. Create loop segment linking transcript to session using service role
      const segmentInsert: TablesInsert<'loop_segments'> = {
        session_id: sessionRecord.id,
        start_time: data.startTime,
        end_time: data.endTime,
        transcript_id: transcriptRecord.id,
        has_transcript: true,
        label: `${data.videoTitle} (${data.startTime}s-${data.endTime}s)`,
        description: `Practice segment from ${data.videoTitle}`,
        transcript_metadata: {
          segmentCount: data.segments.length,
          language: data.language,
          fullTextLength: data.transcript.length
        }
      }

      const { data: segmentRecord, error: segmentError } = await serviceSupabase
        .from('loop_segments')
        .insert(segmentInsert)
        .select()
        .single()

      if (segmentError) {
        throw new Error(`Failed to create loop segment: ${segmentError.message}`)
      }

      return {
        id: sessionRecord.id,
        videoUrl: data.videoUrl,
        videoTitle: data.videoTitle,
        videoId: data.videoId,
        startTime: data.startTime,
        endTime: data.endTime,
        transcript: data.transcript,
        segments: data.segments,
        language: data.language,
        groupId: undefined, // User loops are not tied to groups
        createdBy: data.userId,
        createdAt: sessionRecord.created_at,
        updatedAt: sessionRecord.updated_at,
        metadata: {
          transcriptId: transcriptRecord.id,
          segmentId: segmentRecord.id,
          userLoop: true,
          ...data.metadata
        }
      }
    } catch (error) {
      console.error('Failed to create user loop:', error)
      throw error
    }
  }

  /**
   * Get user loops (not tied to any specific group)
   */
  async getUserLoops(userId: string): Promise<LoopWithStats[]> {
    if (!this.request) {
      throw new Error('Request context required')
    }

    const supabase = getSupabaseServer(this.request)
    const user = await getCurrentUserServer(supabase)

    if (!user) {
      throw new Error('Authentication required')
    }

    // Ensure user can only access their own loops
    if (user.id !== userId) {
      throw new Error('Access denied: Can only access your own loops')
    }
    
    try {
      const { data: sessions, error } = await supabase!
        .from('practice_sessions')
        .select(
          `
          id,
          video_id,
          video_title,
          video_url,
          video_duration,
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
              full_text,
              segments,
              language
            )
          )
        `
        )
        .eq('status', 'active')
        .eq('user_id', userId)
        .eq('metadata->userLoop', 'true')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch user loops: ${error.message}`)
      }

      console.log(`getUserLoops: Found ${sessions.length} user loops for user ${userId}`)

      // Get session IDs for stats calculation
      const sessionIds = sessions.map(s => s.id)

      // Get practice session counts (from shared_question_sets)
      const { data: practiceStats } = await supabase!
        .from('shared_question_sets')
        .select('session_id')
        .in('session_id', sessionIds)
        .not('session_id', 'is', null)

      // Get question counts from shared_question_sets
      const { data: questionStats } = await supabase!
        .from('shared_question_sets')
        .select('session_id, questions')
        .in('session_id', sessionIds)
        .not('session_id', 'is', null)

      // Create stats maps
      const practiceCountMap = new Map<string, number>()
      practiceStats?.forEach((stat: any) => {
        const count = practiceCountMap.get(stat.session_id) || 0
        practiceCountMap.set(stat.session_id, count + 1)
      })

      const questionCountMap = new Map<string, number>()
      questionStats?.forEach((stat: any) => {
        if (stat.questions && Array.isArray(stat.questions)) {
          const existingCount = questionCountMap.get(stat.session_id) || 0
          questionCountMap.set(stat.session_id, Math.max(existingCount, stat.questions.length))
        }
      })

      // Transform to Loop format with real stats
      const loops: LoopWithStats[] = sessions.map(session => {
        const segment = session.loop_segments[0]
        const transcript = Array.isArray(segment?.transcripts)
          ? segment.transcripts[0]
          : segment?.transcripts

        return {
          id: session.id,
          videoUrl: session.video_url,
          videoTitle: session.video_title,
          videoId: session.video_id,
          startTime: segment?.start_time || 0,
          endTime: segment?.end_time || session.video_duration || 0,
          transcript: transcript?.full_text || '',
          segments: transcript?.segments || [],
          language: transcript?.language,
          createdBy: session.user_id,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          metadata: {
            transcriptId: segment?.transcript_id,
            segmentId: segment?.id,
            userLoop: true,
            ...session.metadata
          },
          practiceSessionsCount: practiceCountMap.get(session.id) || 0,
          questionsCount: questionCountMap.get(session.id) || 0
        }
      })

      console.log(`getUserLoops: Returning ${loops.length} loops`)
      return loops
    } catch (error) {
      console.error('Failed to fetch user loops:', error)
      throw error
    }
  }

  /**
   * Delete a user loop
   */
  async deleteUserLoop(userId: string, loopId: string): Promise<void> {
    const supabase = getSupabaseServer()
    if (!supabase) {
      throw new Error('Database not configured')
    }
    
    try {
      // Verify ownership first
      const { data: session, error: fetchError } = await supabase
        .from('practice_sessions')
        .select('id, user_id, metadata')
        .eq('id', loopId)
        .eq('user_id', userId)
        .eq('metadata->>userLoop', 'true') // Use string 'true' for JSONB comparison
        .single()

      if (fetchError || !session) {
        throw new Error('Loop not found or access denied')
      }

      // Delete in reverse order of creation
      // 1. Delete loop segments (will cascade to related data)
      await supabase.from('loop_segments').delete().eq('session_id', loopId)

      // 2. Delete practice session
      const { error: sessionError } = await supabase
        .from('practice_sessions')
        .delete()
        .eq('id', loopId)

      if (sessionError) {
        throw new Error(`Failed to delete practice session: ${sessionError.message}`)
      }

      // 3. Delete transcript if no other references
      if (session.metadata?.transcriptId) {
        const { data: segments } = await supabase
          .from('loop_segments')
          .select('id')
          .eq('transcript_id', session.metadata.transcriptId)

        if (!segments || segments.length === 0) {
          await supabase.from('transcripts').delete().eq('id', session.metadata.transcriptId)
        }
      }
    } catch (error) {
      console.error('Failed to delete user loop:', error)
      throw error
    }
  }
}

/**
 * Factory function to create Loop Management Service
 */
export function createLoopManagementService(request?: NextRequest): LoopManagementService {
  return new LoopManagementService(request)
}
