import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCurrentUser, supabase } from '../supabase/client'
import type { Tables, TablesInsert } from '../supabase/types'
import type { ApiConfig, UserPreferences } from '../types'
import type {
  AudioComparisonState,
  AudioRecording,
  FluentFlowSettings,
  FluentFlowStore,
  FluentFlowUIState,
  LoopSegment,
  LoopState,
  PracticeSession,
  PracticeStatistics,
  RecordingState,
  SavedLoop,
  YouTubePlayerState,
  YouTubeVideoInfo
} from '../types/fluent-flow-types'

// Database type aliases
type ProfileRow = Tables<'profiles'>
type SessionRow = Tables<'practice_sessions'>
type SegmentRow = Tables<'loop_segments'>
type RecordingRow = Tables<'audio_recordings'>
type StatisticsRow = Tables<'practice_statistics'>

type SessionInsert = TablesInsert<'practice_sessions'>
type SegmentInsert = TablesInsert<'loop_segments'>
type RecordingInsert = TablesInsert<'audio_recordings'>
type StatisticsInsert = TablesInsert<'practice_statistics'>

// Default states (same as before)
const defaultPlayerState: YouTubePlayerState = {
  isReady: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 100,
  isMuted: false
}

const defaultLoopState: LoopState = {
  isActive: false,
  startTime: null,
  endTime: null,
  mode: 'setting-start',
  isLooping: false
}

const defaultRecordingState: RecordingState = {
  isRecording: false,
  isPaused: false,
  currentRecording: null,
  mediaRecorder: null,
  recordingStartTime: null,
  audioChunks: []
}

const defaultComparisonState: AudioComparisonState = {
  isComparing: false,
  originalAudio: null,
  recordedAudio: null,
  playbackMode: 'original',
  alternatingStep: 0
}

const defaultUIState: FluentFlowUIState = {
  isPanelVisible: false,
  activeTab: 'loop',
  isExpanded: false,
  position: { x: 20, y: 20 }
}

const defaultSettings: FluentFlowSettings = {
  keyboardShortcuts: {
    toggleLoop: 'Alt+L',
    toggleRecording: 'Alt+R',
    compareAudio: 'Alt+C',
    togglePanel: 'Alt+F',
    setLoopStart: 'Alt+1',
    setLoopEnd: 'Alt+2',
    playPause: 'Alt+Space'
  },
  autoSaveRecordings: true,
  maxRecordingDuration: 300,
  audioQuality: 'medium',
  showVisualFeedback: true,
  enableHapticFeedback: false,
  panelPosition: 'top-right'
}

const defaultStatistics: PracticeStatistics = {
  totalSessions: 0,
  totalPracticeTime: 0,
  totalRecordings: 0,
  averageSessionDuration: 0,
  mostPracticedVideos: [],
  weeklyProgress: []
}

// Utility functions for data conversion
const convertSessionRowToSession = (
  session: SessionRow,
  segments: SegmentRow[] = [],
  recordings: RecordingRow[] = []
): PracticeSession => ({
  id: session.id,
  videoId: session.video_id,
  videoTitle: session.video_title,
  videoUrl: session.video_url,
  segments: segments.map(convertSegmentRowToSegment),
  recordings: recordings.map(convertRecordingRowToRecording),
  totalPracticeTime: session.total_practice_time || 0,
  createdAt: new Date(session.created_at),
  updatedAt: new Date(session.updated_at)
})

const convertSegmentRowToSegment = (segment: SegmentRow): LoopSegment => ({
  id: segment.id,
  startTime: segment.start_time,
  endTime: segment.end_time,
  label: segment.label || undefined,
  description: segment.description || undefined,
  createdAt: new Date(segment.created_at),
  updatedAt: new Date(segment.updated_at)
})

const convertRecordingRowToRecording = (recording: RecordingRow): AudioRecording => ({
  id: recording.id,
  videoId: (recording.metadata as any)?.originalVideoId || '',
  audioData: new Blob(), // Will be loaded from URL when needed
  duration: recording.duration,
  createdAt: new Date(recording.created_at),
  // Add metadata for file handling
  fileUrl: (recording.metadata as any)?.publicUrl || null,
  filePath: recording.file_path
})

// Supabase service functions
const supabaseService = {
  async getUserProfile(): Promise<ProfileRow | null> {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  },

  async updateUserSettings(settings: FluentFlowSettings): Promise<void> {
    const user = await getCurrentUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ settings: settings as any })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating user settings:', error)
      throw error
    }
  },

  async getUserPreferences(): Promise<UserPreferences | null> {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('user_preferences')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }

    return (data?.user_preferences as unknown as UserPreferences) || null
  },

  async updateUserPreferences(preferences: UserPreferences): Promise<void> {
    const user = await getCurrentUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ user_preferences: preferences as any })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  },

  async getApiConfig(): Promise<ApiConfig | null> {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('api_config')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching API config:', error)
      return null
    }

    return (data?.api_config as unknown as ApiConfig) || null
  },

  async updateApiConfig(config: ApiConfig): Promise<void> {
    const user = await getCurrentUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ api_config: config as any })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating API config:', error)
      throw error
    }
  },

  async createSession(videoInfo: YouTubeVideoInfo): Promise<string> {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    // Validate required fields to prevent database constraint violations
    if (!videoInfo.videoId || !videoInfo.title || !videoInfo.url) {
      throw new Error('Invalid video info: missing required fields (videoId, title, url)')
    }

    const sessionData: SessionInsert = {
      user_id: user.id,
      video_id: videoInfo.videoId,
      video_title: videoInfo.title,
      video_channel: videoInfo.channel || 'Unknown Channel',
      video_duration: videoInfo.duration || 0,
      video_url: videoInfo.url,
      status: 'active'
    }

    const { data, error } = await supabase
      .from('practice_sessions')
      .insert(sessionData)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating session:', error)
      throw error
    }

    return data.id
  },

  async getUserSessions(): Promise<PracticeSession[]> {
    const user = await getCurrentUser()
    if (!user) return []

    // Get sessions with their segments and recordings
    const { data: sessions, error: sessionsError } = await supabase
      .from('practice_sessions')
      .select(
        `
        *,
        loop_segments (*),
        audio_recordings (*)
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return []
    }

    return sessions.map(session =>
      convertSessionRowToSession(
        session,
        session.loop_segments || [],
        session.audio_recordings || []
      )
    )
  },

  async addLoopSegment(
    sessionId: string,
    segment: Omit<LoopSegment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const segmentData: SegmentInsert = {
      session_id: sessionId,
      start_time: segment.startTime,
      end_time: segment.endTime,
      label: segment.label,
      description: segment.description
    }

    const { data, error } = await supabase
      .from('loop_segments')
      .insert(segmentData)
      .select('id')
      .single()

    if (error) {
      console.error('Error adding loop segment:', error)
      throw error
    }

    return data.id
  },

  async getAllUserLoops(userId: string): Promise<SavedLoop[]> {
    console.log(`getAllUserLoops: Fetching loops for user ${userId}`)

    // Add a small random timestamp to bust any potential caching
    const cacheBuster = Date.now()
    console.log(`getAllUserLoops: Cache buster timestamp: ${cacheBuster}`)

    const { data: sessions, error } = await supabase
      .from('practice_sessions')
      .select(
        `
        id,
        video_id,
        video_title,
        video_url,
        metadata,
        created_at,
        updated_at,
        loop_segments (
          id,
          start_time,
          end_time,
          label,
          description,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', userId)
      .not('metadata->savedLoop', 'is', null)
      .order('updated_at', { ascending: false }) // Order by updated_at instead of created_at to get latest changes first

    if (error) {
      console.error('Error loading user loops:', error)
      throw error
    }

    console.log(`getAllUserLoops: Retrieved ${sessions?.length || 0} practice sessions`)

    // Convert Supabase data to SavedLoop format
    const savedLoops: SavedLoop[] = []

    sessions?.forEach(session => {
      const loopMetadata = session.metadata as any
      const segment = session.loop_segments?.[0] // Get first segment

      if (loopMetadata?.savedLoop && segment) {
        // ✅ CACHE REMOVED: Questions now stored in conversation_questions table only
        console.log(
          `getAllUserLoops: ✅ Processing loop ${loopMetadata.savedLoop.id} - cache removed, using database`
        )

        const savedLoop: SavedLoop = {
          id: loopMetadata.savedLoop.id,
          title: segment.label || loopMetadata.savedLoop.title || 'Untitled Loop',
          videoId: session.video_id,
          videoTitle: session.video_title,
          videoUrl: session.video_url,
          startTime: segment.start_time,
          endTime: segment.end_time,
          description: segment.description || loopMetadata.savedLoop.description,
          createdAt: new Date(loopMetadata.savedLoop.createdAt || session.created_at),
          updatedAt: new Date(loopMetadata.savedLoop.updatedAt || session.updated_at),

          // Questions removed from metadata - they are now stored in conversation_questions table
          questions: [], // Always empty - questions come from database
          questionsGenerated: false, // Reset - will be determined from database
          questionMetadata: null,
          lastQuestionGeneration: null,
          questionsGeneratedAt: undefined,
          totalQuestionsGenerated: 0,

          // Include transcript fields from metadata
          hasTranscript: loopMetadata.savedLoop.hasTranscript || false,
          transcriptMetadata: loopMetadata.savedLoop.transcriptMetadata || null
        }
        savedLoops.push(savedLoop)
      }
    })

    return savedLoops
  },

  async deleteLoop(userId: string, loopId: string): Promise<boolean> {
    const { data: sessions, error: selectError } = await supabase
      .from('practice_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('metadata->savedLoop->>id', loopId)

    if (selectError) {
      console.error('Error finding loop to delete:', selectError)
      throw selectError
    }

    if (!sessions || sessions.length === 0) {
      return false // Loop not found
    }

    // Delete the practice session (this will cascade delete loop_segments)
    const { error: deleteError } = await supabase
      .from('practice_sessions')
      .delete()
      .eq('id', sessions[0].id)

    if (deleteError) {
      console.error('Error deleting loop:', deleteError)
      throw deleteError
    }

    return true
  },

  async deleteAllUserLoops(userId: string): Promise<boolean> {
    // First get all loops for the user
    const { data: sessions, error: selectError } = await supabase
      .from('practice_sessions')
      .select('id')
      .eq('user_id', userId)
      .not('metadata->savedLoop', 'is', null)

    if (selectError) {
      console.error('Error finding loops to delete:', selectError)
      throw selectError
    }

    if (!sessions || sessions.length === 0) {
      return true // No loops to delete
    }

    // Delete all practice sessions with loops (this will cascade delete loop_segments)
    const sessionIds = sessions.map(s => s.id)
    const { error: deleteError } = await supabase
      .from('practice_sessions')
      .delete()
      .in('id', sessionIds)

    if (deleteError) {
      console.error('Error deleting all loops:', deleteError)
      throw deleteError
    }

    return true
  },

  async saveLoop(userId: string, loop: SavedLoop): Promise<string> {
    // Save to Supabase: create or update practice session with loop segment
    const sessionData = {
      user_id: userId,
      video_id: loop.videoId,
      video_title: loop.videoTitle,
      video_url: loop.videoUrl,
      metadata: {
        savedLoop: {
          id: loop.id,
          title: loop.title,
          description: loop.description,
          createdAt:
            typeof loop.createdAt === 'string' ? loop.createdAt : loop.createdAt.toISOString(),
          updatedAt:
            typeof loop.updatedAt === 'string' ? loop.updatedAt : loop.updatedAt.toISOString(),
          hasTranscript: loop.hasTranscript || false,
          transcriptMetadata: loop.transcriptMetadata || null,
          // 🔧 FIX: Include transcript data in metadata for backward compatibility
          transcript: loop.transcript || '',
          segments: loop.segments || [],
          language: loop.language || 'auto'
        }
      }
    }

    // Check if session already exists for this video and user
    const { data: existingSessions } = await supabase
      .from('practice_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', loop.videoId)
      .eq('metadata->savedLoop->>id', loop.id)

    let sessionId: string

    if (existingSessions && existingSessions.length > 0) {
      // Update existing session
      sessionId = existingSessions[0].id
      await supabase
        .from('practice_sessions')
        .update({
          ...sessionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert(sessionData)
        .select('id')
        .single()

      if (sessionError) throw sessionError
      sessionId = newSession.id
    }

    // Create or update loop segment
    const { data: existingSegments } = await supabase
      .from('loop_segments')
      .select('id')
      .eq('session_id', sessionId)

    let segmentId: string

    if (existingSegments && existingSegments.length > 0) {
      // Update existing segment
      segmentId = existingSegments[0].id
      await supabase
        .from('loop_segments')
        .update({
          start_time: loop.startTime,
          end_time: loop.endTime,
          label: loop.title,
          description: loop.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', segmentId)
    } else {
      // 🔄 FIX: Process transcript FIRST, then create segment with transcript_id if available
      let transcriptId: string | null = null

      // 🚀 Create transcript data if available BEFORE creating loop segment
      if (loop.transcript && loop.transcript.trim() && loop.segments && loop.segments.length > 0) {
        console.log(
          `🔄 FluentFlow: Processing transcript data for loop ${loop.id} BEFORE creating segment`
        )

        try {
          // Check if transcript already exists for this segment
          const { data: existingTranscript } = await supabase
            .from('transcripts')
            .select('id')
            .eq('video_id', loop.videoId)
            .eq('start_time', loop.startTime)
            .eq('end_time', loop.endTime)
            .maybeSingle()

          const transcriptData = {
            video_id: loop.videoId,
            start_time: loop.startTime,
            end_time: loop.endTime,
            segments: loop.segments,
            full_text: loop.transcript,
            language: loop.language || 'auto',
            metadata: {
              createdAt: new Date().toISOString(),
              source: 'fluent-flow-extension',
              loopId: loop.id
            }
          }

          if (existingTranscript) {
            // Update existing transcript
            await supabase
              .from('transcripts')
              .update({
                ...transcriptData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingTranscript.id)
            transcriptId = existingTranscript.id
          } else {
            // Create new transcript
            const { data: newTranscript, error: transcriptError } = await supabase
              .from('transcripts')
              .insert(transcriptData)
              .select('id')
              .single()

            if (transcriptError) throw transcriptError
            transcriptId = newTranscript.id
          }

          console.log(
            `✅ FluentFlow: Successfully created/updated transcript ${transcriptId} for loop ${loop.id}`
          )
        } catch (transcriptError) {
          console.error(
            `❌ FluentFlow: Failed to process transcript data for loop ${loop.id}:`,
            transcriptError
          )
          // Continue with segment creation even if transcript fails, but log the error
          transcriptId = null
        }
      }

      // Create new segment WITH transcript_id if available
      const segmentData: any = {
        session_id: sessionId,
        start_time: loop.startTime,
        end_time: loop.endTime,
        label: loop.title,
        description: loop.description
      }

      // Include transcript linking data if transcript was created successfully
      if (transcriptId) {
        segmentData.transcript_id = transcriptId
        segmentData.has_transcript = true
        segmentData.transcript_metadata = {
          language: loop.language || 'auto',
          segmentCount: loop.segments?.length || 0,
          textLength: loop.transcript?.length || 0,
          lastUpdated: new Date().toISOString()
        }
      }

      const { data: newSegment, error: segmentError } = await supabase
        .from('loop_segments')
        .insert(segmentData)
        .select('id')
        .single()

      if (segmentError) throw segmentError
      segmentId = newSegment.id

      if (transcriptId) {
        console.log(
          `✅ FluentFlow: Successfully created loop segment ${segmentId} with transcript ${transcriptId} for loop ${loop.id}`
        )
      } else {
        console.log(
          `ℹ️ FluentFlow: Created loop segment ${segmentId} without transcript for loop ${loop.id}`
        )
      }
    }

    return sessionId
  },

  async saveRecording(
    sessionId: string,
    recording: AudioRecording,
    segmentId?: string
  ): Promise<string> {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    try {
      // Generate unique filename for the audio file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${user.id}/${sessionId}/${recording.id}_${timestamp}.webm`

      // Upload audio file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(filename, recording.audioData, {
          contentType: 'audio/webm',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading audio file:', uploadError)
        throw uploadError
      }

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filename)

      // Save recording metadata to database
      const recordingData: RecordingInsert = {
        session_id: sessionId,
        segment_id: segmentId || null,
        user_id: user.id,
        duration: recording.duration,
        audio_format: 'webm',
        file_path: filename, // Store the file path
        file_size: recording.audioData.size,
        metadata: {
          originalVideoId: recording.videoId,
          publicUrl: publicUrlData.publicUrl
        }
      }

      const { data, error } = await supabase
        .from('audio_recordings')
        .insert(recordingData)
        .select('id')
        .single()

      if (error) {
        // If database insert fails, try to clean up the uploaded file
        await supabase.storage.from('audio-recordings').remove([filename])
        throw error
      }

      return data.id
    } catch (error) {
      console.error('Error saving recording:', error)
      throw error
    }
  },

  async getAllUserRecordings(userId: string, videoId?: string): Promise<AudioRecording[]> {
    let query = supabase
      .from('audio_recordings')
      .select(
        `
        id, session_id, segment_id, user_id, file_path, file_size, duration, 
        audio_format, quality_score, transcription, notes, tags, is_favorite, 
        metadata, created_at, updated_at,
        practice_sessions (
          id, video_id, video_title, video_url
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (videoId) {
      query = query.eq('practice_sessions.video_id', videoId)
    }

    const { data: recordings, error } = await query

    if (error) {
      console.error('Error loading user recordings:', error)
      throw error
    }

    // Convert to AudioRecording format
    const audioRecordings: AudioRecording[] = []

    if (recordings) {
      for (const recording of recordings) {
        const session = recording.practice_sessions as any

        const audioRecording: AudioRecording = {
          id: recording.id,
          videoId: session?.video_id || '',
          audioData: new Blob(), // Will need to be loaded separately from storage
          duration: recording.duration,
          createdAt: new Date(recording.created_at),
          updatedAt: new Date(recording.updated_at)
        }

        audioRecordings.push(audioRecording)
      }
    }

    return audioRecordings
  },

  async deleteUserRecording(userId: string, recordingId: string): Promise<boolean> {
    // First get the recording details to find the file path
    const { data: recording, error: fetchError } = await supabase
      .from('audio_recordings')
      .select('file_path')
      .eq('id', recordingId)
      .eq('user_id', userId) // Ensure user owns the recording
      .single()

    if (fetchError) {
      console.error('Error fetching recording for deletion:', fetchError)
      return false
    }

    // Delete the recording from the database
    const { error: deleteError } = await supabase
      .from('audio_recordings')
      .delete()
      .eq('id', recordingId)
      .eq('user_id', userId) // Ensure user owns the recording

    if (deleteError) {
      console.error('Error deleting recording from database:', deleteError)
      throw deleteError
    }

    // If there's a file path, delete the file from Storage
    if (recording?.file_path) {
      const { error: storageError } = await supabase.storage
        .from('audio-recordings')
        .remove([recording.file_path])

      if (storageError) {
        console.error('Error deleting audio file from storage:', storageError)
        // Don't return false here - database deletion succeeded
      }
    }

    return true
  },

  async updatePracticeStatistics(stats: Partial<PracticeStatistics>): Promise<void> {
    const user = await getCurrentUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const statisticsData: StatisticsInsert = {
      user_id: user.id,
      date: today,
      total_practice_time: stats.totalPracticeTime || 0,
      sessions_count: stats.totalSessions || 0,
      recordings_count: stats.totalRecordings || 0,
      avg_session_duration: stats.averageSessionDuration || 0
    }

    const { error } = await supabase.from('practice_statistics').upsert(statisticsData, {
      onConflict: 'user_id,date'
    })

    if (error) {
      console.error('Error updating statistics:', error)
      throw error
    }
  },

  // Transcript operations
  async getTranscript(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<{ id: string; segments: any[]; fullText: string; language: string } | null> {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('video_id', videoId)
      .eq('start_time', startTime)
      .eq('end_time', endTime)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching row found
        return null
      }
      console.error('Error fetching transcript:', error)
      throw error
    }

    return {
      id: data.id,
      segments: data.segments as any[],
      fullText: data.full_text,
      language: data.language || 'auto'
    }
  },

  async saveTranscript(
    videoId: string,
    startTime: number,
    endTime: number,
    segments: any[],
    fullText: string,
    language: string = 'auto'
  ): Promise<string> {
    const transcriptData = {
      video_id: videoId,
      start_time: startTime,
      end_time: endTime,
      segments: segments,
      full_text: fullText,
      language: language,
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'youtube.js'
      }
    }

    const { data, error } = await supabase
      .from('transcripts')
      .insert(transcriptData)
      .select('id')
      .single()

    if (error) {
      console.error('Error saving transcript:', error)
      throw error
    }

    const transcriptId = data.id

    // 🚀 NEW: Auto-link transcript with existing loop segments that match video_id and timeframe
    try {
      console.log(
        `🔄 FluentFlow: Linking transcript ${transcriptId} with matching loop segments for video ${videoId}`
      )

      // First get the session IDs for this video
      const { data: sessions } = await supabase
        .from('practice_sessions')
        .select('id')
        .eq('video_id', videoId)

      if (!sessions || sessions.length === 0) {
        console.log('ℹ️ FluentFlow: No sessions found for this video')
        return transcriptId
      }

      const sessionIds = sessions.map(s => s.id)

      const { data: matchingSegments, error: segmentError } = await supabase
        .from('loop_segments')
        .select('id, session_id')
        .is('transcript_id', null) // Only update segments that don't have transcript yet
        .gte('start_time', startTime - 0.1) // Allow small tolerance for floating point precision
        .lte('start_time', startTime + 0.1)
        .gte('end_time', endTime - 0.1)
        .lte('end_time', endTime + 0.1)
        .in('session_id', sessionIds)

      if (segmentError) {
        console.error('Error finding matching segments:', segmentError)
      } else if (matchingSegments && matchingSegments.length > 0) {
        console.log(
          `🔗 FluentFlow: Found ${matchingSegments.length} matching loop segments to link`
        )

        // Update all matching segments to link with this transcript
        const segmentIds = matchingSegments.map(s => s.id)
        const { error: updateError } = await supabase
          .from('loop_segments')
          .update({
            transcript_id: transcriptId,
            has_transcript: true,
            transcript_metadata: {
              language: language,
              segmentCount: segments.length,
              textLength: fullText.length,
              lastUpdated: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .in('id', segmentIds)

        if (updateError) {
          console.error('Error linking transcript to segments:', updateError)
        } else {
          console.log(
            `✅ FluentFlow: Successfully linked transcript ${transcriptId} to ${segmentIds.length} loop segments`
          )
        }
      } else {
        console.log(`ℹ️ FluentFlow: No matching loop segments found for transcript ${transcriptId}`)
      }
    } catch (linkError) {
      console.error('Error during transcript linking:', linkError)
      // Don't throw - transcript save succeeded, linking is bonus
    }

    return transcriptId
  },

  async updateLoopWithTranscript(
    segmentId: string,
    transcriptId: string,
    transcriptMetadata: any
  ): Promise<void> {
    const { error } = await supabase
      .from('loop_segments')
      .update({
        transcript_id: transcriptId,
        has_transcript: true,
        transcript_metadata: transcriptMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', segmentId)

    if (error) {
      console.error('Error updating loop with transcript:', error)
      throw error
    }
  },

  // Question operations
  async getQuestions(segmentId: string): Promise<any[] | null> {
    const user = await getCurrentUser()
    if (!user) return null

    console.log(
      `getQuestions: ✅ CACHE REMOVED - Fetching questions from database for segment ${segmentId}`
    )

    // Always use the conversation_questions table - no more loop metadata caching
    // Try raw query to avoid 406 error
    try {
      const { data, error } = (await supabase
        .from('conversation_questions')
        .select('questions')
        .or(`loop_id.eq.${segmentId}`)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()) as any // Avoid deep type instantiation and allow null

      if (error) {
        console.error('Error in raw query:', error)
        return null
      }

      if (data) {
        console.log(
          `getQuestions: Found ${Array.isArray(data.questions) ? data.questions.length : 0} questions for segment ${segmentId}`
        )
        return Array.isArray(data.questions) ? (data.questions as any[]) : null
      }

      console.log(`getQuestions: No questions found for segment ${segmentId}`)
      return null
    } catch (queryError) {
      console.error('Query failed:', queryError)
      return null
    }
  },

  async saveQuestions(segmentId: string, questions: any[], metadata: any = {}): Promise<string> {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    console.log(`saveQuestions: Saving ${questions.length} questions for segment ${segmentId}`)

    // Always save to conversation_questions table - no more loop metadata caching
    const questionData = {
      loop_id: segmentId, // Use loop_id for non-UUID identifiers
      segment_id: null as string | null, // Set segment_id to null since we're using loop_id
      user_id: user.id,
      questions: questions as any, // Cast to any to satisfy Json type
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        questionCount: questions.length
      } as any // Cast to any to satisfy Json type
    }

    try {
      // First try to check if record exists using or query
      const { data: existing, error: fetchError } = (await supabase
        .from('conversation_questions')
        .select('id')
        .or(`loop_id.eq.${segmentId}`)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()) as any // Avoid deep type instantiation

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error('Error checking existing questions:', fetchError)
      }

      let result: { data: any; error: any }
      if (existing) {
        console.log(`saveQuestions: Updating existing record for segment ${segmentId}`)
        // Update existing record
        const { data, error } = await supabase
          .from('conversation_questions')
          .update(questionData)
          .eq('id', existing.id)
          .select('id')
          .single()

        result = { data, error }
      } else {
        console.log(`saveQuestions: Creating new record for segment ${segmentId}`)
        // Insert new record
        const { data, error } = await supabase
          .from('conversation_questions')
          .insert(questionData)
          .select('id')
          .single()

        result = { data, error }
      }

      if (result.error) {
        console.error('Error saving questions:', result.error)
        throw result.error
      }

      console.log(
        `saveQuestions: Successfully saved ${questions.length} questions for segment ${segmentId}`
      )
      return result.data.id
    } catch (error) {
      // If all else fails, just try a simple insert
      console.log('Falling back to simple insert for questions:', error)
      const { data, error: insertError } = await supabase
        .from('conversation_questions')
        .insert(questionData)
        .select('id')
        .single()

      if (insertError) {
        console.error('Error saving questions with fallback:', insertError)
        throw insertError
      }

      console.log(`saveQuestions: Successfully saved ${questions.length} questions via fallback`)
      return data.id
    }
  },

  // Clear questions from loop metadata (for regenerate functionality)
  async clearQuestions(segmentId: string): Promise<boolean> {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    console.log(`clearQuestions: Clearing questions for segment ${segmentId}`)

    try {
      // Delete from conversation_questions table using or query
      const { error } = (await supabase
        .from('conversation_questions')
        .delete()
        .or(`loop_id.eq.${segmentId}`)
        .eq('user_id', user.id)) as any // Avoid type instantiation

      if (error) {
        console.error('Error clearing questions:', error)
        return false
      }

      console.log(`clearQuestions: Successfully cleared questions for segment ${segmentId}`)
      return true
    } catch (error) {
      console.error(`clearQuestions: Error clearing questions for segment ${segmentId}:`, error)
      return false
    }
  }
}

// Export supabaseService for use in React Query hooks
export { supabaseService }

export const useFluentFlowSupabaseStore = create<FluentFlowStore>()(
  persist(
    (set, get) => ({
      // State
      playerState: defaultPlayerState,
      currentVideo: null,
      loopState: defaultLoopState,
      recordingState: defaultRecordingState,
      comparisonState: defaultComparisonState,
      uiState: defaultUIState,
      settings: defaultSettings,
      currentSession: null,
      allSessions: [],
      statistics: defaultStatistics,

      // Actions
      initializePlayer: async (videoInfo: YouTubeVideoInfo) => {
        set({
          currentVideo: videoInfo,
          playerState: { ...defaultPlayerState, isReady: true }
        })

        // Try to load existing session or create new one
        try {
          const sessions = await supabaseService.getUserSessions()
          const existingSession = sessions.find(s => s.videoId === videoInfo.videoId)

          if (existingSession) {
            set({ currentSession: existingSession, allSessions: sessions })
          } else {
            // Create new session in database
            const sessionId = await supabaseService.createSession(videoInfo)
            const newSession: PracticeSession = {
              id: sessionId,
              videoId: videoInfo.videoId,
              videoTitle: videoInfo.title,
              videoUrl: videoInfo.url,
              segments: [],
              recordings: [],
              totalPracticeTime: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            }
            set({
              currentSession: newSession,
              allSessions: [newSession, ...sessions]
            })
          }
        } catch (error) {
          console.error('Failed to initialize session:', error)
        }
      },

      updatePlayerState: (newState: Partial<YouTubePlayerState>) => {
        set(state => ({
          playerState: { ...state.playerState, ...newState }
        }))
      },

      setLoopSegment: async (startTime: number, endTime: number) => {
        const { currentSession } = get()
        if (!currentSession) return

        try {
          const segmentId = await supabaseService.addLoopSegment(currentSession.id, {
            startTime,
            endTime
          })

          const segment: LoopSegment = {
            id: segmentId,
            startTime,
            endTime,
            createdAt: new Date(),
            updatedAt: new Date()
          }

          set(state => ({
            loopState: {
              ...state.loopState,
              isActive: true,
              startTime,
              endTime,
              mode: 'complete'
            },
            currentSession: state.currentSession
              ? {
                  ...state.currentSession,
                  segments: [...state.currentSession.segments, segment],
                  updatedAt: new Date()
                }
              : null
          }))
        } catch (error) {
          console.error('Failed to save loop segment:', error)
        }
      },

      startRecording: async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          })

          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          })

          const audioChunks: Blob[] = []

          mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
              audioChunks.push(event.data)
            }
          }

          mediaRecorder.start(250)

          set({
            recordingState: {
              isRecording: true,
              isPaused: false,
              currentRecording: null,
              mediaRecorder,
              recordingStartTime: Date.now(),
              audioChunks
            }
          })
        } catch (error) {
          console.error('Failed to start recording:', error)
          throw new Error('Microphone access denied or not available')
        }
      },

      stopRecording: async (): Promise<AudioRecording> => {
        return new Promise((resolve, reject) => {
          const { recordingState, currentVideo } = get()

          if (!recordingState.mediaRecorder || !currentVideo) {
            reject(new Error('No active recording or video'))
            return
          }

          recordingState.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(recordingState.audioChunks, {
              type: 'audio/webm;codecs=opus'
            })

            const duration = recordingState.recordingStartTime
              ? (Date.now() - recordingState.recordingStartTime) / 1000
              : 0

            const recording: AudioRecording = {
              id: `recording_${Date.now()}`,
              videoId: currentVideo.videoId,
              audioData: audioBlob,
              duration,
              createdAt: new Date()
            }

            recordingState.mediaRecorder?.stream.getTracks().forEach(track => track.stop())

            set({
              recordingState: {
                ...defaultRecordingState,
                currentRecording: recording
              }
            })

            resolve(recording)
          }

          recordingState.mediaRecorder.stop()
        })
      },

      saveRecording: async (recording: AudioRecording) => {
        const { currentSession } = get()
        if (!currentSession) return

        try {
          const recordingId = await supabaseService.saveRecording(currentSession.id, recording)

          const savedRecording = { ...recording, id: recordingId }

          set(state => {
            const updatedSession = state.currentSession
              ? {
                  ...state.currentSession,
                  recordings: [...state.currentSession.recordings, savedRecording],
                  updatedAt: new Date()
                }
              : null

            const newStats = {
              ...state.statistics,
              totalRecordings: state.statistics.totalRecordings + 1
            }

            // Update statistics in database
            supabaseService.updatePracticeStatistics(newStats)

            return {
              currentSession: updatedSession,
              statistics: newStats
            }
          })
        } catch (error) {
          console.error('Failed to save recording:', error)
        }
      },

      deleteRecording: async (recordingId: string) => {
        try {
          // First get the recording details to find the file path
          const { data: recording, error: fetchError } = await supabase
            .from('audio_recordings')
            .select('file_path')
            .eq('id', recordingId)
            .single()

          if (fetchError) {
            console.error('Error fetching recording for deletion:', fetchError)
          }

          // Delete the recording from the database
          const { error: deleteError } = await supabase
            .from('audio_recordings')
            .delete()
            .eq('id', recordingId)

          if (deleteError) {
            throw deleteError
          }

          // If there's a file path, delete the file from Storage
          if (recording?.file_path) {
            const { error: storageError } = await supabase.storage
              .from('audio-recordings')
              .remove([recording.file_path])

            if (storageError) {
              console.error('Error deleting audio file from storage:', storageError)
              // Don't throw here - database deletion succeeded
            }
          }

          // Update local state
          set(state => ({
            currentSession: state.currentSession
              ? {
                  ...state.currentSession,
                  recordings: state.currentSession.recordings.filter(r => r.id !== recordingId),
                  updatedAt: new Date()
                }
              : null,
            statistics: {
              ...state.statistics,
              totalRecordings: Math.max(0, state.statistics.totalRecordings - 1)
            }
          }))
        } catch (error) {
          console.error('Failed to delete recording:', error)
          throw error
        }
      },

      startComparison: (recording: AudioRecording, segment: LoopSegment) => {
        set({
          comparisonState: {
            isComparing: true,
            originalAudio: {
              startTime: segment.startTime,
              endTime: segment.endTime
            },
            recordedAudio: recording,
            playbackMode: 'original',
            alternatingStep: 0
          }
        })
      },

      stopComparison: () => {
        set({
          comparisonState: defaultComparisonState
        })
      },

      togglePanel: () => {
        set(state => ({
          uiState: {
            ...state.uiState,
            isPanelVisible: !state.uiState.isPanelVisible
          }
        }))
      },

      updateSettings: async (newSettings: Partial<FluentFlowSettings>) => {
        const updatedSettings = { ...get().settings, ...newSettings }

        set(() => ({
          settings: updatedSettings
        }))

        try {
          await supabaseService.updateUserSettings(updatedSettings)
        } catch (error) {
          console.error('Failed to update settings:', error)
        }
      },

      loadSession: async (videoId: string): Promise<PracticeSession | null> => {
        try {
          const sessions = await supabaseService.getUserSessions()
          const session = sessions.find(s => s.videoId === videoId)

          if (session) {
            set({ currentSession: session, allSessions: sessions })
            return session
          }

          return null
        } catch (error) {
          console.error('Failed to load session:', error)
          return null
        }
      },

      saveSession: async () => {
        const { currentSession, statistics } = get()

        if (!currentSession) return

        try {
          // Update statistics in database
          await supabaseService.updatePracticeStatistics(statistics)

          // Refresh sessions from database
          const sessions = await supabaseService.getUserSessions()
          set({ allSessions: sessions })
        } catch (error) {
          console.error('Failed to save session:', error)
        }
      },

      getAllUserLoops: async (): Promise<SavedLoop[]> => {
        try {
          const user = await getCurrentUser()
          if (!user) {
            console.warn('No authenticated user found')
            return []
          }

          return await supabaseService.getAllUserLoops(user.id)
        } catch (error) {
          console.error('Failed to load user loops:', error)
          return []
        }
      },

      deleteLoop: async (loopId: string): Promise<boolean> => {
        try {
          const user = await getCurrentUser()
          if (!user) {
            console.warn('No authenticated user found')
            return false
          }

          return await supabaseService.deleteLoop(user.id, loopId)
        } catch (error) {
          console.error('Failed to delete loop:', error)
          return false
        }
      },

      deleteAllUserLoops: async (): Promise<boolean> => {
        try {
          const user = await getCurrentUser()
          if (!user) {
            console.warn('No authenticated user found')
            return false
          }

          return await supabaseService.deleteAllUserLoops(user.id)
        } catch (error) {
          console.error('Failed to delete all loops:', error)
          return false
        }
      },

      saveLoop: async (loop: SavedLoop): Promise<string | null> => {
        try {
          const user = await getCurrentUser()
          if (!user) {
            console.warn('No authenticated user found')
            return null
          }

          return await supabaseService.saveLoop(user.id, loop)
        } catch (error) {
          console.error('Failed to save loop:', error)
          return null
        }
      },

      getAllUserRecordings: async (videoId?: string): Promise<AudioRecording[]> => {
        try {
          const user = await getCurrentUser()
          if (!user) {
            console.warn('No authenticated user found')
            return []
          }

          return await supabaseService.getAllUserRecordings(user.id, videoId)
        } catch (error) {
          console.error('Failed to load user recordings:', error)
          return []
        }
      },

      deleteUserRecording: async (recordingId: string): Promise<boolean> => {
        try {
          const user = await getCurrentUser()
          if (!user) {
            console.warn('No authenticated user found')
            return false
          }

          return await supabaseService.deleteUserRecording(user.id, recordingId)
        } catch (error) {
          console.error('Failed to delete recording:', error)
          return false
        }
      }
    }),
    {
      name: 'fluent-flow-supabase-storage',
      partialize: state => ({
        settings: state.settings,
        statistics: state.statistics,
        uiState: {
          ...state.uiState,
          isPanelVisible: false
        }
      })
    }
  )
)

// Export function to get the store with service
export const getFluentFlowStore = () => {
  return {
    store: useFluentFlowSupabaseStore,
    supabaseService
  }
}
