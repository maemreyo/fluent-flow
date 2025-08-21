import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  maxRecordingDuration: 300, // 5 minutes
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

export const useFluentFlowStore = create<FluentFlowStore>()(
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
      initializePlayer: (videoInfo: YouTubeVideoInfo) => {
        set({
          currentVideo: videoInfo,
          playerState: { ...defaultPlayerState, isReady: true }
        })
      },

      updatePlayerState: (newState: Partial<YouTubePlayerState>) => {
        set(state => ({
          playerState: { ...state.playerState, ...newState }
        }))
      },

      setLoopSegment: (startTime: number, endTime: number) => {
        const { currentVideo } = get()
        if (!currentVideo) return

        const segment: LoopSegment = {
          id: `loop_${Date.now()}`,
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
            : {
                id: `session_${Date.now()}`,
                videoId: currentVideo.videoId,
                videoTitle: currentVideo.title,
                videoUrl: currentVideo.url,
                segments: [segment],
                recordings: [],
                totalPracticeTime: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              }
        }))
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

          mediaRecorder.start(250) // Collect data every 250ms

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

            // Stop all tracks
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
        set(state => {
          const updatedSession = state.currentSession
            ? {
                ...state.currentSession,
                recordings: [...state.currentSession.recordings, recording],
                updatedAt: new Date()
              }
            : null

          return {
            currentSession: updatedSession,
            statistics: {
              ...state.statistics,
              totalRecordings: state.statistics.totalRecordings + 1
            }
          }
        })
      },

      deleteRecording: (recordingId: string) => {
        set(state => ({
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                recordings: state.currentSession.recordings.filter(r => r.id !== recordingId),
                updatedAt: new Date()
              }
            : null
        }))
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

      updateSettings: (newSettings: Partial<FluentFlowSettings>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }))
      },

      loadSession: async (videoId: string): Promise<PracticeSession | null> => {
        const { allSessions } = get()
        const session = allSessions.find(s => s.videoId === videoId)

        if (session) {
          set({ currentSession: session })
          return session
        }

        return null
      },

      saveSession: async () => {
        const { currentSession, allSessions } = get()

        if (!currentSession) return

        const existingIndex = allSessions.findIndex(s => s.id === currentSession.id)

        if (existingIndex >= 0) {
          const updatedSessions = [...allSessions]
          updatedSessions[existingIndex] = currentSession
          set({ allSessions: updatedSessions })
        } else {
          set(state => ({
            allSessions: [...allSessions, currentSession],
            statistics: {
              ...state.statistics,
              totalSessions: state.statistics.totalSessions + 1
            }
          }))
        }
      },

      getAllUserLoops: async (): Promise<SavedLoop[]> => {
        console.warn('getAllUserLoops not implemented in basic store')
        return []
      },

      deleteLoop: async (loopId: string): Promise<boolean> => {
        console.warn('deleteLoop not implemented in basic store')
        return false
      },

      saveLoop: async (loop: SavedLoop): Promise<string | null> => {
        console.warn('saveLoop not implemented in basic store')
        return null
      },

      getAllUserRecordings: async (videoId?: string): Promise<AudioRecording[]> => {
        console.warn('getAllUserRecordings not implemented in basic store')
        return []
      },

      deleteUserRecording: async (recordingId: string): Promise<boolean> => {
        console.warn('deleteUserRecording not implemented in basic store')
        return false
      }
    }),
    {
      name: 'fluent-flow-storage',
      partialize: state => ({
        settings: state.settings,
        allSessions: state.allSessions,
        statistics: state.statistics,
        uiState: {
          ...state.uiState,
          isPanelVisible: false // Reset panel visibility on reload
        }
      })
    }
  )
)
