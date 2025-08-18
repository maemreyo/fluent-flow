# FluentFlow - YouTube Language Learning Extension Architecture

## MVP Feature Set
**Focus: Individual Practice Tools (No Backend Required)**

### Core Features
1. **A/B Loop System**
   - YouTube player API integration
   - Segment selection and looping controls
   - Keyboard shortcuts for seamless practice

2. **Voice Recording**
   - MediaRecorder API for audio capture
   - IndexedDB storage for recordings
   - Playback controls and management

3. **Audio Comparison**
   - Quick switching between original and recorded audio
   - Synchronized playback timing
   - Side-by-side waveform visualization (optional)

## Technical Architecture

### Content Script (YouTube Integration)
- **Location**: `content.ts`
- **Responsibilities**:
  - Inject FluentFlow UI into YouTube pages
  - YouTube Player API integration
  - Keyboard shortcut handling
  - DOM manipulation for controls

### Service Layer
- **Location**: `lib/services/`
- **Services**:
  - `youtube-service.ts` - YouTube Player API wrapper
  - `recording-service.ts` - MediaRecorder integration
  - `audio-service.ts` - Audio comparison logic
  - `storage-service.ts` - IndexedDB management

### State Management
- **Technology**: Zustand stores
- **Stores**:
  - `practice-store.ts` - A/B loop state, current segment
  - `recording-store.ts` - Active recordings, playback state
  - `ui-store.ts` - Panel visibility, keyboard shortcuts

### UI Components
- **Main Panel**: Floating overlay on YouTube
- **Loop Controls**: Start/end markers, play/pause
- **Recording Controls**: Record, playback, compare
- **Audio Timeline**: Visual representation of segments

## YouTube Integration Strategy

### Player API Access
```typescript
// Inject YouTube IFrame Player API
window.onYouTubeIframeAPIReady = () => {
  // Initialize FluentFlow player wrapper
}
```

### UI Injection Points
- **Overlay Panel**: Positioned relative to YouTube player
- **Control Bar**: Below video player
- **Sidebar**: Expandable recording management

### Keyboard Shortcuts
- `Alt + L`: Set loop start/end
- `Alt + R`: Start/stop recording  
- `Alt + C`: Compare audio
- `Alt + Space`: Play/pause loop

## Data Storage Strategy

### IndexedDB Schema
```typescript
interface PracticeSession {
  id: string
  videoId: string
  title: string
  segments: LoopSegment[]
  recordings: AudioRecording[]
  createdAt: Date
}

interface LoopSegment {
  id: string
  startTime: number
  endTime: number
  label?: string
}

interface AudioRecording {
  id: string
  segmentId: string
  audioData: Blob
  duration: number
  createdAt: Date
}
```

## Security & Privacy
- **Local Storage Only**: No user data leaves device
- **Permission Management**: Microphone access on-demand
- **Data Cleanup**: Automatic cleanup of old recordings

## Future Backend Integration Points
- User authentication for group features
- Cloud storage for recording sync
- Real-time collaboration APIs
- Analytics and progress tracking