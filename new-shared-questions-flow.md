# New Shared Questions Flow - Database-First Approach

## Current Problems with In-Memory Storage
- ❌ Server restart = data loss  
- ❌ No persistence for group sessions
- ❌ Can't query/manage shared questions
- ❌ Scaling issues with multiple servers
- ❌ Complex group integration

## New Architecture: Database-First

### 1. Database Schema
```sql
shared_question_sets:
  - id (UUID)
  - share_token (UUID, unique)
  - title, video_title, video_url
  - start_time, end_time
  - questions (JSONB)
  - vocabulary (JSONB) 
  - transcript (TEXT)
  - metadata (JSONB)
  - is_public (BOOLEAN)
  - created_by (UUID → auth.users)
  - group_id (UUID → study_groups, nullable)
  - session_id (UUID → group_quiz_sessions, nullable)
  - expires_at (TIMESTAMPTZ)
  - created_at, updated_at
```

### 2. New Flow Scenarios

#### A. Public Sharing (Individual Users)
```
Extension → API → Database → Share URL
1. User creates questions in extension
2. POST /api/share-questions
3. Creates row in shared_question_sets (is_public=true, expires_at=4h)
4. Returns share_token
5. Share URL: /questions/{token}
```

#### B. Group Session Sharing
```
Extension → API → Database → Group Session
1. User clicks "Share to Group" in extension  
2. POST /api/extension/create-group-session
3. Creates row in shared_question_sets (is_public=false, group_id, session_id)
4. Creates row in group_quiz_sessions 
5. Links: session.share_token = question_set.share_token
6. Share URL: /questions/{token}?groupId={id}&sessionId={id}
```

### 3. Benefits of New Approach

#### ✅ Persistence & Reliability
- Questions survive server restarts
- Can recover and manage old sessions
- Backup/restore capabilities

#### ✅ Better Group Integration  
- Direct foreign key relationships
- Can query all questions for a group
- Historical tracking of group sessions
- Easy to show "Past Sessions" in group dashboard

#### ✅ Enhanced Features Possible
- **Search**: Find questions by title, video, topics
- **Analytics**: Track popular questions, success rates
- **Management**: Admins can manage/delete inappropriate content
- **Extensions**: Favorite questions, duplicate detection
- **Scheduling**: Pre-create sessions, schedule for later

#### ✅ Performance & Scalability
- Database indexes for fast lookups
- Can implement caching layer if needed
- Supports multiple server instances
- Auto-cleanup of expired content

### 4. Migration Strategy

#### Phase 1: Parallel Implementation
- Keep existing in-memory system running
- Implement new database system alongside
- Test with new question sets

#### Phase 2: Gradual Migration  
- New questions use database system
- Existing in-memory questions expire naturally (4h)
- Monitor for issues

#### Phase 3: Full Cutover
- Remove in-memory storage code
- All questions use database system
- Add cleanup job for expired questions

### 5. API Changes Required

#### Update Existing Routes:
- `/api/share-questions` → Use SharedQuestionsService
- `/api/extension/create-group-session` → Link to database
- `/api/questions/[token]` → Query database instead of memory

#### New Routes:
- `/api/questions/[token]/extend` → Extend expiration
- `/api/groups/[id]/questions` → List group's question sets
- `/api/admin/questions` → Content moderation

### 6. Code Changes

#### Replace in-memory storage:
```typescript
// OLD: lib/shared-storage.ts
export const sharedQuestions = new Map()

// NEW: lib/services/shared-questions-service.ts  
export class SharedQuestionsService {
  async createSharedQuestionSet(...)
  async getSharedQuestionSet(token)
}
```

#### Update API routes to use service:
```typescript
// In API routes:
const questionsService = createSharedQuestionsService(request)
const questionSet = await questionsService.createSharedQuestionSet({
  title: 'Video Title',
  questions: questions,
  group_id: groupId,
  session_id: sessionId
})
```

### 7. Immediate Benefits for Groups

#### Better Session Management:
- Sessions persist even if server restarts
- Can edit session details after creation
- Historical view of all group sessions
- Can reuse popular question sets

#### Enhanced Analytics:
- Track which videos/topics are popular
- See group engagement over time
- Identify most active members
- Performance comparisons across sessions

#### Improved User Experience:
- "Recently shared" lists
- Bookmark favorite question sets
- Search through group's question history
- Mobile-friendly persistence

## Implementation Priority

1. **High**: Create database table ✅ (Done)
2. **High**: Implement SharedQuestionsService ✅ (Done)  
3. **High**: Update group session creation API ✅ (Done)
4. **Medium**: Update share-questions API ✅ (Done)
5. **Medium**: Update questions/[token] route ✅ (Done)
6. **Medium**: Add cleanup job for expired questions ✅ (Done)
7. **Low**: Add management/analytics features

## Cleanup System

### Automated Cleanup
```typescript
// Scheduled cleanup runs every 6 hours
import { startCleanupSchedule } from './lib/scheduled-tasks'
startCleanupSchedule()
```

### Manual Cleanup
```bash
# GET /api/admin/cleanup-expired-questions - Check status
# POST /api/admin/cleanup-expired-questions - Run cleanup manually
curl -X POST http://localhost:3838/api/admin/cleanup-expired-questions
```

### Cleanup Rules
- Only deletes **public** question sets (is_public=true)
- Only deletes **expired** question sets (expires_at < now)
- Group sessions (is_public=false) are preserved
- Returns count of deleted records

This new flow provides a solid foundation for group learning while maintaining backward compatibility and adding powerful new capabilities!