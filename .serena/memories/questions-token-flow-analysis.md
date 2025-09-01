# Questions Token Flow Analysis

## Current Architecture
- **Extension Integration**: Extension calls `/api/share-questions` with questions, loop data, vocabulary, transcript
- **Token Generation**: Creates UUID token and stores in memory via `sharedQuestions.set(token, data)` 
- **Storage**: In-memory storage with 4-hour expiration (perfect for classroom sessions)
- **Page Access**: Users access `/questions/[token]` page which fetches data via `/api/questions/[token]`
- **Quiz Flow**: Uses `useQuiz` hook managing state, answers, submission to `/api/questions/[token]/submit`
- **Authentication**: Uses AuthPrompt component and useQuizAuth hook for login integration

## Key Data Structures
```typescript
// sharedQuestionSet structure
{
  id: string,
  shareToken: string, 
  title: string,
  videoTitle: string,
  videoUrl: string,
  startTime: number,
  endTime: number,
  questions: Question[],
  vocabulary: string[],
  transcript: string,
  metadata: { totalQuestions, createdAt, sharedBy, difficulty, topics },
  isPublic: boolean,
  shareUrl: string,
  sessions: [] // Track user sessions
}
```

## Group Session Integration Points
1. **Extension Flow**: Extension → `/api/share-questions` → option to create group session
2. **Web Flow**: Groups page → schedule session → import from recent loops 
3. **Hybrid Integration**: Extend existing token system to support group context
4. **Session Tracking**: Leverage existing sessions array in sharedQuestionSet