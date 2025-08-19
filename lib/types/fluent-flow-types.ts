export interface LoopSegment {
  id: string
  startTime: number
  endTime: number
  label?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface SavedLoop {
  id: string
  title: string
  videoId: string
  videoTitle: string
  videoUrl: string
  startTime: number
  endTime: number
  description?: string
  createdAt: Date
  updatedAt: Date
}

// Time-based Notes Feature Types
export interface TimestampedNote {
  id: string
  videoId: string
  timestamp: number  // Video time in seconds
  content: string   // Note text content
  type: 'observation' | 'question' | 'vocabulary' | 'grammar' | 'pronunciation'
  tags?: string[]   // Optional tags for categorization
  createdAt: Date
  updatedAt: Date
}

export interface RecordingSession {
  id: string
  videoId: string
  videoTitle: string
  videoUrl: string
  audioBlob?: Blob
  duration: number
  notes: TimestampedNote[]  // Notes taken during this session
  createdAt: Date
  updatedAt: Date
}

export interface NoteCategory {
  id: string
  name: string
  color: string
  icon: string
}

export interface VideoNotes {
  videoId: string
  videoTitle: string
  videoUrl: string
  totalNotes: number
  sessions: RecordingSession[]
  allNotes: TimestampedNote[]  // Aggregated notes from all sessions
  lastUpdated: Date
}

export interface AudioRecording {
  id: string
  segmentId?: string
  videoId: string
  audioData: Blob
  duration: number
  title?: string
  notes?: string
  createdAt: Date
  // New fields for Supabase Storage integration
  fileUrl?: string | null
  filePath?: string | null
}

export interface PracticeSession {
  id: string
  videoId: string
  videoTitle: string
  videoUrl: string
  segments: LoopSegment[]
  recordings: AudioRecording[]
  totalPracticeTime: number
  createdAt: Date
  updatedAt: Date
}

export interface YouTubePlayerState {
  isReady: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  volume: number
  isMuted: boolean
}

export interface LoopState {
  isActive: boolean
  startTime: number | null
  endTime: number | null
  mode: 'setting-start' | 'setting-end' | 'complete'
  isLooping: boolean
}

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  currentRecording: AudioRecording | null
  mediaRecorder: MediaRecorder | null
  recordingStartTime: number | null
  audioChunks: Blob[]
}

export interface AudioComparisonState {
  isComparing: boolean
  originalAudio: {
    startTime: number
    endTime: number
  } | null
  recordedAudio: AudioRecording | null
  playbackMode: 'original' | 'recorded' | 'alternating'
  alternatingStep: number
}

export interface FluentFlowUIState {
  isPanelVisible: boolean
  activeTab: 'loop' | 'record' | 'compare' | 'history'
  isExpanded: boolean
  position: {
    x: number
    y: number
  }
}

export interface KeyboardShortcuts {
  toggleLoop: string
  toggleRecording: string
  compareAudio: string
  togglePanel: string
  setLoopStart: string
  setLoopEnd: string
  playPause: string
}

export interface FluentFlowSettings {
  keyboardShortcuts: KeyboardShortcuts
  autoSaveRecordings: boolean
  maxRecordingDuration: number
  audioQuality: 'low' | 'medium' | 'high'
  showVisualFeedback: boolean
  enableHapticFeedback: boolean
  panelPosition: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'
}

export interface YouTubeVideoInfo {
  videoId: string
  title: string
  channel: string
  duration: number
  url: string
  thumbnailUrl?: string
  language?: string
  hasSubtitles: boolean
}

export interface PracticeStatistics {
  totalSessions: number
  totalPracticeTime: number
  totalRecordings: number
  averageSessionDuration: number
  mostPracticedVideos: YouTubeVideoInfo[]
  weeklyProgress: {
    date: string
    practiceTime: number
    sessions: number
  }[]
}

export type FluentFlowMessage = 
  | { type: 'INIT_PLAYER'; payload: {} }
  | { type: 'SET_LOOP_SEGMENT'; payload: { startTime: number; endTime: number } }
  | { type: 'START_RECORDING'; payload: {} }
  | { type: 'STOP_RECORDING'; payload: {} }
  | { type: 'SAVE_RECORDING'; payload: { recording: AudioRecording } }
  | { type: 'LOAD_SESSION'; payload: { videoId: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<FluentFlowSettings> }
  | { type: 'TOGGLE_PANEL'; payload: {} }
  | { type: 'COMPARE_AUDIO'; payload: { recording: AudioRecording; segment: LoopSegment } }

export interface FluentFlowStore {
  // Player state
  playerState: YouTubePlayerState
  currentVideo: YouTubeVideoInfo | null
  
  // Practice state
  loopState: LoopState
  recordingState: RecordingState
  comparisonState: AudioComparisonState
  
  // UI state
  uiState: FluentFlowUIState
  settings: FluentFlowSettings
  
  // Data
  currentSession: PracticeSession | null
  allSessions: PracticeSession[]
  statistics: PracticeStatistics
  
  // Actions
  initializePlayer: (videoInfo: YouTubeVideoInfo) => void
  updatePlayerState: (state: Partial<YouTubePlayerState>) => void
  setLoopSegment: (startTime: number, endTime: number) => void
  startRecording: () => Promise<void>
  stopRecording: () => Promise<AudioRecording>
  saveRecording: (recording: AudioRecording) => Promise<void>
  deleteRecording: (recordingId: string) => void
  startComparison: (recording: AudioRecording, segment: LoopSegment) => void
  stopComparison: () => void
  togglePanel: () => void
  updateSettings: (settings: Partial<FluentFlowSettings>) => void
  loadSession: (videoId: string) => Promise<PracticeSession | null>
  saveSession: () => Promise<void>
  getAllUserLoops: () => Promise<SavedLoop[]>
  deleteLoop: (loopId: string) => Promise<boolean>
  saveLoop: (loop: SavedLoop) => Promise<string | null>
}

export interface IndexedDBSchema {
  sessions: {
    key: string
    value: PracticeSession
    indexes: {
      videoId: string
      createdAt: Date
    }
  }
  recordings: {
    key: string
    value: AudioRecording
    indexes: {
      videoId: string
      segmentId: string
      createdAt: Date
    }
  }
  settings: {
    key: string
    value: FluentFlowSettings
  }
}

export interface YouTubePlayerAPI {
  getCurrentTime(): number
  getDuration(): number
  getPlaybackRate(): number
  getVolume(): number
  isMuted(): boolean
  getPlayerState(): number
  seekTo(seconds: number, allowSeekAhead?: boolean): void
  playVideo(): void
  pauseVideo(): void
  setPlaybackRate(rate: number): void
  setVolume(volume: number): void
  mute(): void
  unMute(): void
  addEventListener(event: string, listener: string): void
  removeEventListener(event: string, listener: string): void
}

export interface FluentFlowError extends Error {
  code: 'PLAYER_NOT_READY' | 'RECORDING_FAILED' | 'STORAGE_ERROR' | 'PERMISSION_DENIED' | 'INVALID_SEGMENT'
  context?: Record<string, any>
}