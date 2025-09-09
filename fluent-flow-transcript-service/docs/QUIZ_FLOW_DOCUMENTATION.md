# Quiz Flow Documentation

## Overview

This document describes the complete flow of the quiz system across all screens, including state management, navigation logic, and user interactions.

## Application States

The quiz system uses the following `AppState` values to manage flow:

```typescript
type AppState =
  | 'loading'           // Initial loading state
  | 'preset-selection'  // Setup screen - choose presets
  | 'question-info'     // DEPRECATED - redirects to question-preview
  | 'question-preview'  // Preview screen - see questions before starting
  | 'quiz-active'       // Active screen - taking the quiz
  | 'quiz-results'      // Results screen - view final scores
  | 'error'            // Error state
```

## Screen-by-Screen Flow

### 1. **Root Page** (`/[sessionId]/page.tsx`)
- **Purpose**: Entry point that redirects based on current state
- **Logic**: 
  - Checks session status and user permissions
  - Redirects to appropriate screen based on `appState`
- **Navigation**: Automatic redirect only

### 2. **Setup Screen** (`/[sessionId]/setup/page.tsx`) 
- **AppState**: `'preset-selection'`
- **Purpose**: Configure quiz presets and generate questions
- **Features**:
  - Preset selection (difficulty, question count)
  - Question generation from transcripts
  - Real-time generation progress
- **Navigation**:
  - **Next**: `/preview` (when questions are generated)
  - **Permissions**: Owner/Admin only

### 3. **Lobby Screen** (`/[sessionId]/lobby/page.tsx`)
- **AppState**: `'preset-selection'` (waiting state)
- **Purpose**: Waiting room for participants before quiz starts
- **Features**:
  - Participant list with online status
  - Real-time updates via Supabase channels
  - Different views for Owner vs Members
- **Navigation**:
  - **Owner**: Can start quiz → `/info`
  - **Members**: Wait for owner to start

### 4. **Info Screen** (DEPRECATED - removed)
- **AppState**: `'question-info'` (DEPRECATED - redirects to preview)
- **Purpose**: Display quiz overview and allow final preparation
- **Features**:
  - Question count by difficulty
  - Estimated duration
  - Quiz settings summary
- **Navigation**:
  - **Next**: `/preview` (via "Start Quiz" button)
  - **Back**: `/setup` or `/lobby`

### 5. **Preview Screen** (`/[sessionId]/preview/page.tsx`)
- **AppState**: `'question-preview'`
- **Purpose**: Show actual questions before starting timer
- **Features**:
  - Browse through questions without answering
  - Final chance to review before committing
- **Navigation**:
  - **Next**: `/active` (via "Start Quiz" button)
  - **Back**: `/info`

### 6. **Active Screen** (`/[sessionId]/active/page.tsx`)
- **AppState**: `'quiz-active'`
- **Purpose**: Main quiz-taking interface
- **Features**:
  - Question answering with multiple choice
  - Timer (if enabled)
  - Progress tracking
  - Set-by-set progression (Easy → Medium → Hard)
  - Question navigation within sets
- **Navigation**:
  - **Next**: `/results` (when all sets completed)
  - **No Back**: Prevents accidental exit

### 7. **Results Screen** (`/[sessionId]/results/page.tsx`)
- **AppState**: `'quiz-results'`
- **Purpose**: Display final quiz results and statistics
- **Features**:
  - Score breakdown by difficulty
  - Leaderboard (if applicable)
  - Performance analytics
- **Navigation**:
  - **Back**: Return to group (external navigation)

## Navigation Flow Diagram

```
┌─────────────┐
│    Root     │ (Auto-redirect based on state)
│   /[id]     │
└─────┬───────┘
      │
      ▼
┌─────────────┐    Generate Questions    ┌─────────────┐
│   Setup     │ ────────────────────────▶│    Info     │
│  /setup     │                          │   /info     │
│(preset-sel) │                          │(question-   │
└─────┬───────┘                          │   info)     │
      │                                  └─────┬───────┘
      │ Wait for Start                         │
      ▼                                        │ Start Quiz
┌─────────────┐                               ▼
│   Lobby     │                          ┌─────────────┐
│  /lobby     │                          │  Preview    │
│(preset-sel) │                          │ /preview    │
└─────────────┘                          │(question-   │
                                         │  preview)   │
                                         └─────┬───────┘
                                               │
                                               │ Start Quiz
                                               ▼
                                         ┌─────────────┐
                                         │   Active    │
                                         │  /active    │
                                         │(quiz-active)│
                                         └─────┬───────┘
                                               │
                                               │ Complete Quiz
                                               ▼
                                         ┌─────────────┐
                                         │  Results    │
                                         │ /results    │
                                         │(quiz-results)│
                                         └─────────────┘
```

## State Management

### AppState Management
- **Storage**: In-memory state only (no persistence)
- **Behavior**: State resets on page refresh
- **Navigation**: Natural browser behavior without forced redirects

### Question Data Caching
- **Technology**: TanStack Query with sessionStorage persistence
- **Cache Key**: `['quiz', 'sessions', groupId, sessionId, 'questions']`
- **Duration**: 30 minutes stale time, 24 hours garbage collection
- **Cross-Page**: Shared across all quiz pages

## Permission System

### Role-Based Access
- **Owner/Admin**: Full access to all screens, can configure and start quiz
- **Member**: Limited to lobby → info → preview → active → results flow
- **Unauthenticated**: Blocked from sensitive operations

### Navigation Guards
- **Setup**: Owner/Admin only
- **Other screens**: All authenticated users
- **Auto-redirect**: Based on user role and current state

## Real-time Features

### Supabase Integration
- **Channel**: `quiz_session_${sessionId}`
- **Events**: 
  - Participant join/leave
  - Quiz state changes
  - Question generation progress
  - Session updates

### Live Updates
- Participant status (online/offline)
- Quiz progression
- Real-time state synchronization

## Error Handling

### State Recovery
- **Invalid State**: Redirect to appropriate screen
- **Missing Data**: Reload from API with cache fallback
- **Network Errors**: Retry with exponential backoff

### User Experience
- **Loading States**: Show progress indicators
- **Error Messages**: User-friendly error descriptions
- **Fallbacks**: Graceful degradation when features unavailable

## Browser Navigation

### Back Button Handling
- **Setup/Info/Preview**: Natural back navigation allowed
- **Active**: Confirmation dialog to prevent accidental exit
- **Results**: External navigation to group overview

### URL Structure
```
/groups/[groupId]/quiz/[sessionId]/[screen]
```

### Deep Linking
- **Direct URLs**: Supported for all screens
- **State Validation**: Auto-redirect if state mismatch
- **Persistence**: State maintained across direct access

## Performance Optimizations

### Caching Strategy
1. **Questions**: Long-term cache (30min stale, 24hr GC)
2. **Session Data**: Medium-term cache (2min stale, 5min GC) 
3. **Real-time Data**: Short-term cache (30s stale, 2min GC)

### Code Splitting
- Each screen loads independently
- Shared components cached
- Progressive loading for better UX

### Memory Management
- Automatic cleanup of timers and subscriptions
- Query garbage collection
- Event listener cleanup

## Security Considerations

### Data Protection
- **Answers**: Stored securely with user association
- **Questions**: Cached locally, cleared on session end
- **Auth Tokens**: Secure HTTP-only cookies

### Access Control
- **API Endpoints**: Role-based permissions
- **Client-side**: UI restrictions (not security boundary)
- **Real-time**: Channel-level access control

## Testing Strategy

### E2E Flow Testing
1. **Happy Path**: Setup → Info → Preview → Active → Results
2. **Permission Flows**: Different user roles
3. **Error Scenarios**: Network failures, invalid states
4. **Browser Navigation**: Back/forward buttons, direct URLs

### Integration Points
- **State Persistence**: Page refresh scenarios
- **Real-time Updates**: Multi-user interactions
- **Cache Behavior**: Cross-page data sharing

## Future Enhancements

### Planned Features
- **Resume**: Allow resuming incomplete quizzes
- **Offline Mode**: Basic functionality without internet
- **Analytics**: Detailed performance metrics
- **Export**: Results export in multiple formats

### Architecture Improvements
- **State Machine**: Formal state management with XState
- **Micro-frontends**: Split screens into independent apps
- **Progressive Web App**: Offline capabilities and push notifications

---

*This document reflects the current implementation as of the latest updates. For technical implementation details, refer to the source code in the respective page components and hooks.*