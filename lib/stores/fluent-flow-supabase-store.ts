import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getCurrentUser } from '../supabase/client'
import type { Database, Tables, TablesInsert, TablesUpdate } from '../supabase/types'
import type {
  FluentFlowStore,
  YouTubePlayerState,
  YouTubeVideoInfo,
  LoopState,
  RecordingState,
  AudioComparisonState,
  FluentFlowUIState,
  FluentFlowSettings,
  PracticeSession,
  AudioRecording,
  LoopSegment,
  PracticeStatistics
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
    togglePanel: 'Alt+Shift+F',
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
const convertSessionRowToSession = (session: SessionRow, segments: SegmentRow[] = [], recordings: RecordingRow[] = []): PracticeSession => ({
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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

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

  async createSession(videoInfo: YouTubeVideoInfo): Promise<string> {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const sessionData: SessionInsert = {
      user_id: user.id,
      video_id: videoInfo.videoId,
      video_title: videoInfo.title,
      video_channel: videoInfo.channel,
      video_duration: videoInfo.duration,
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
      .select(`
        *,
        loop_segments (*),
        audio_recordings (*)
      `)
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

  async addLoopSegment(sessionId: string, segment: Omit<LoopSegment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
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

  async saveRecording(sessionId: string, recording: AudioRecording, segmentId?: string): Promise<string> {
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
        await supabase.storage
          .from('audio-recordings')
          .remove([filename])
        throw error
      }

      return data.id
    } catch (error) {
      console.error('Error saving recording:', error)
      throw error
    }
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

    const { error } = await supabase
      .from('practice_statistics')
      .upsert(statisticsData, {
        onConflict: 'user_id,date'
      })

    if (error) {
      console.error('Error updating statistics:', error)
      throw error
    }
  }
}

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
        set((state) => ({
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

          set((state) => ({
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

          mediaRecorder.ondataavailable = (event) => {
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
          const recordingId = await supabaseService.saveRecording(
            currentSession.id,
            recording
          )

          const savedRecording = { ...recording, id: recordingId }

          set((state) => {
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
          set((state) => ({
            currentSession: state.currentSession
              ? {
                  ...state.currentSession,
                  recordings: state.currentSession.recordings.filter(
                    r => r.id !== recordingId
                  ),
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
        set((state) => ({
          uiState: {
            ...state.uiState,
            isPanelVisible: !state.uiState.isPanelVisible
          }
        }))
      },

      updateSettings: async (newSettings: Partial<FluentFlowSettings>) => {
        const updatedSettings = { ...get().settings, ...newSettings }
        
        set((state) => ({
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
      }
    }),
    {
      name: 'fluent-flow-supabase-storage',
      partialize: (state) => ({
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