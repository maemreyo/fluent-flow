# Group Session API Specifications
*Deep Integration with Existing Questions/Token System*

## API Endpoint Structure

### 1. Extension Integration Endpoints

```typescript
// For extension dropdown - get user's groups
GET /api/user/groups
Headers: { Authorization: "Bearer <token>" }
Response: {
  groups: Array<{
    id: string
    name: string  
    role: 'owner' | 'admin' | 'member'
    member_count: number
  }>
}

// Extension creates group session (extends existing share-questions)
POST /api/extension/create-group-session  
Body: {
  questions: QuestionData,
  loop: LoopData,
  vocabulary?: string[],
  transcript?: string,
  groupId: string,
  options: {
    title?: string
    scheduledAt?: string // ISO string for instant vs scheduled
    notifyMembers?: boolean
  }
}
Response: {
  shareToken: string // Same as existing system
  shareUrl: string   // questions/[token]?groupId=X&sessionId=Y
  sessionId: string
  groupId: string
  expiresAt: number
}
```

### 2. Group Session Management

```typescript
// Create instant session (from extension or web)
POST /api/groups/[groupId]/sessions/create-instant
Body: {
  shareToken?: string // Optional - if using existing questions
  questions?: QuestionData // Optional - if creating new
  loop?: LoopData
  title: string
  notifyMembers?: boolean
}

// Schedule session (web only)
POST /api/groups/[groupId]/sessions/schedule
Body: {
  title: string
  description?: string
  scheduledAt: string // ISO timestamp
  questions?: QuestionData
  shareToken?: string // Import from recent loops
  loop?: LoopData
  notifyMembers: boolean
}

// List group sessions
GET /api/groups/[groupId]/sessions?status=active|scheduled|completed
Response: {
  sessions: Array<{
    id: string
    title: string
    shareToken: string
    status: 'scheduled' | 'active' | 'completed' | 'cancelled'
    scheduledAt?: string
    startedAt?: string
    endedAt?: string
    participantCount: number
    createdBy: string
    questions_count: number
  }>
}

// Get session details
GET /api/groups/[groupId]/sessions/[sessionId]
Response: {
  session: GroupSession,
  participants: Array<{
    user_id: string
    joined_at: string
    completed_at?: string
    score?: number
  }>
  canJoin: boolean
  shareUrl: string
}

// Update session (reschedule, cancel, etc.)
PUT /api/groups/[groupId]/sessions/[sessionId]
Body: {
  scheduledAt?: string
  status?: 'cancelled' 
  title?: string
  description?: string
}

// Delete session
DELETE /api/groups/[groupId]/sessions/[sessionId]
```

### 3. Enhanced Questions Token API

```typescript
// Extend existing questions/[token] to support group context
GET /api/questions/[token]?groupId=[groupId]&sessionId=[sessionId]
// Returns same data structure + group context:
Response: {
  ...existingQuestionSetData,
  groupContext?: {
    groupId: string
    sessionId: string
    groupName: string
    isGroupSession: boolean
    participantCount: number
    canSeeOthersProgress: boolean
  }
}

// Extend submit to track group participation
POST /api/questions/[token]/submit
Body: {
  responses: Response[],
  groupId?: string // Optional group context
  sessionId?: string
}
// Same response + group result tracking
```

### 4. Recent Loops API (for web import)

```typescript
// Get user's recent extension loops for import
GET /api/extension/recent-loops?days=7
Headers: { Authorization: "Bearer <token>" }
Response: {
  loops: Array<{
    shareToken: string
    title: string
    videoTitle: string
    createdAt: string
    questionCount: number
    canImport: boolean // not expired
  }>
}
```

## Database Schema Updates

```sql
-- Extend existing group_quiz_sessions table
ALTER TABLE group_quiz_sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'scheduled';
ALTER TABLE group_quiz_sessions ADD COLUMN share_token VARCHAR(255); -- Link to existing token system
ALTER TABLE group_quiz_sessions ADD COLUMN questions_data JSONB; -- Backup questions data
ALTER TABLE group_quiz_sessions ADD COLUMN loop_data JSONB; -- Video/loop information

-- Session participation tracking
CREATE TABLE group_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES group_quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  responses JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_group_session_participants_session_id ON group_session_participants(session_id);
CREATE INDEX idx_group_session_participants_user_id ON group_session_participants(user_id);
```

## Integration Strategy

### Phase 1: Extend Existing Token System
- Modify `sharedQuestions` storage to include group context
- Update `/api/questions/[token]` to accept group parameters
- Add group session tracking in existing sessions array

### Phase 2: Extension Integration  
- Add `/api/user/groups` endpoint for extension dropdown
- Create `/api/extension/create-group-session` wrapping existing share logic
- Extension UI: "Share to Group" button alongside existing "Share"

### Phase 3: Web Session Management
- Implement group session CRUD APIs
- Add Sessions tab UI consuming these APIs
- Scheduled sessions with calendar integration

## Permission Matrix

| Action | Owner | Admin | Member | Guest |
|--------|-------|--------|--------|--------|
| Create Instant Session | ✅ | ✅ | ✅* | ❌ |
| Create Scheduled Session | ✅ | ✅ | ❌* | ❌ |
| Join Session | ✅ | ✅ | ✅ | ❌ |
| View Session Results | ✅ | ✅ | ✅ | ❌ |
| Cancel/Reschedule | ✅ | ✅ | Owner only | ❌ |

*Configurable per group settings

## Error Handling

```typescript
// Common error responses
{
  error: 'Group not found' // 404
  error: 'Access denied' // 403  
  error: 'Session expired' // 410
  error: 'Session full' // 409
  error: 'Invalid token' // 400
}
```

## Real-time Features (Future)
- WebSocket connection for live participant updates
- Server-Sent Events for session notifications
- Real-time quiz progress sharing (optional)