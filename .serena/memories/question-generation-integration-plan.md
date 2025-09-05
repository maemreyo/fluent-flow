# Question Generation Integration Plan

## Current System Analysis

### Transcript Service Status
- **Real-time extraction**: `/api/transcript/route.ts` extracts YouTube transcripts on-demand using YouTubei.js
- **Database storage**: `transcripts` table exists but is NOT used by current service
- **Question APIs**: Complete question generation system already implemented at `/api/questions/`
- **Database relationships**: 
  - `transcripts` → `loop_segments` (via transcript_id)
  - `conversation_questions` → `loop_segments` and direct loop_id reference

### Current Application Structure
- **Main app**: Basic transcript testing interface at root `/`
- **Groups system**: Full-featured group learning platform at `/groups`
- **Quiz system**: Group quiz sessions with real-time progress tracking
- **Components**: Well-organized UI components for groups, sessions, questions

## Integration Strategy

### Option 1: Extend Groups System (RECOMMENDED)
Since the groups system already has sophisticated session management and quiz functionality:

1. **Add Loop Management to Groups**:
   - New tab in group interface: "Loops" or "Practice Sessions"
   - Create loops from YouTube URLs with transcript extraction
   - Store transcript segments in database for reuse

2. **Integrate Question Generation into Sessions**:
   - Add "Generate Questions from Loop" option in session creation
   - Use existing session infrastructure for question-based activities
   - Leverage current real-time progress tracking

3. **UI Components to Create**:
   - `LoopCreationModal` - YouTube URL input, time segment selection
   - `LoopManagementTab` - List and manage created loops
   - `QuestionGenerationModal` - Configure AI settings, difficulty presets
   - Enhanced session creation with question generation option

### Option 2: Standalone Loop Management
Create dedicated loop management interface:

1. **New route**: `/loops` for loop management
2. **Components**: Loop creation, editing, question generation
3. **Integration**: Connect to groups via shared question sets

### Option 3: Extend Main Page
Enhance the current basic interface to include loop and question features.

## Recommended Implementation Path

### Phase 1: Database Integration
1. Modify transcript service to optionally save to database
2. Create loop management service connecting transcripts and segments
3. Update question generation to use stored transcript data

### Phase 2: UI Integration - Groups System
1. Add "Loops" tab to group interface
2. Create loop creation and management components
3. Integrate question generation into session creation workflow
4. Connect to existing shared question sets system

### Phase 3: Enhanced Features
1. Bulk loop import from playlists
2. AI-powered loop recommendations
3. Advanced question customization
4. Loop sharing between groups

## Technical Requirements

### New Services Needed
- `LoopManagementService` - CRUD operations for loops
- `TranscriptStorageService` - Save/retrieve transcript data
- Enhanced `QuestionGenerationService` integration

### Database Schema Updates
- Use existing `transcripts`, `loop_segments`, `conversation_questions` tables
- Add loop management metadata
- Connect to existing group/session infrastructure

### UI Components Required
- Loop creation/editing interfaces
- Question generation configuration
- Integration into existing group session workflow

## Benefits of Groups Integration
1. **Leverage existing infrastructure** - Sessions, progress tracking, user management
2. **Natural user flow** - Groups → Sessions → Questions → Practice
3. **Reuse components** - Modal patterns, form validation, real-time updates
4. **Consistent UX** - Matches current application design patterns