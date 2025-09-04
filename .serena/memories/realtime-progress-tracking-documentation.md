# Real-time Progress Tracking - Technical Documentation

## 📋 Feature Specification

### Overview
Real-time Progress Tracking provides live visibility into each participant's learning journey during group quiz sessions, enabling coordinated learning experiences and timely support.

## 🏗️ Architecture Design

### Component Structure
```
├── components/
│   ├── ProgressSidebar/
│   │   ├── ParticipantProgressCard.tsx
│   │   ├── GroupProgressSummary.tsx
│   │   └── ProgressFilters.tsx
│   ├── ProgressIndicators/
│   │   ├── QuestionProgressBar.tsx
│   │   ├── SetProgressIndicator.tsx
│   │   └── ConfidenceIndicator.tsx
│   └── InstructorDashboard/
│       ├── RealTimeInsights.tsx
│       ├── InterventionAlerts.tsx
│       └── PacingControls.tsx
├── hooks/
│   ├── useProgressTracking.ts
│   ├── useGroupPacing.ts
│   └── useProgressInsights.ts
└── services/
    ├── progressService.ts
    └── realtimeProgressService.ts
```

## 📊 Data Models

### Core Progress Data
```typescript
interface ParticipantProgress {
  id: string
  sessionId: string
  userId: string
  username: string
  
  // Question-level progress
  currentQuestion: number
  currentSet: number
  totalQuestionsAnswered: number
  correctAnswers: number
  
  // Timing data
  timeSpent: number // seconds
  questionStartTime: Date
  setStartTime: Date
  
  // Learning indicators
  confidenceLevel: 'high' | 'medium' | 'low'
  strugglingIndicators: StruggleIndicator[]
  helpRequested: boolean
  
  // Status
  isOnline: boolean
  lastActivity: Date
  completed: boolean
}

interface StruggleIndicator {
  type: 'time_spent' | 'multiple_attempts' | 'help_requested' | 'low_confidence'
  severity: 'low' | 'medium' | 'high'
  questionId?: string
  timestamp: Date
}

interface GroupProgressSummary {
  sessionId: string
  totalParticipants: number
  onlineParticipants: number
  
  // Progress distribution
  progressDistribution: {
    notStarted: number
    inProgress: number
    completed: number
  }
  
  // Current state
  averageProgress: number
  fastestParticipant: ParticipantProgress
  slowestParticipant: ParticipantProgress
  
  // Insights
  difficultQuestions: string[]
  groupStruggles: string[]
  readyForNext: boolean
}
```

### Database Schema
```sql
-- Real-time progress table
CREATE TABLE group_quiz_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES group_quiz_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    username TEXT,
    
    -- Progress tracking
    current_question INTEGER DEFAULT 0,
    current_set INTEGER DEFAULT 0,
    total_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    
    -- Timing
    time_spent INTEGER DEFAULT 0, -- seconds
    question_start_time TIMESTAMP,
    set_start_time TIMESTAMP,
    
    -- Status indicators
    confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    struggling_indicators JSONB DEFAULT '[]',
    help_requested BOOLEAN DEFAULT false,
    
    -- Connection status  
    is_online BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT NOW(),
    completed BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(session_id, user_id)
);

-- Progress events for detailed tracking
CREATE TABLE progress_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES group_quiz_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    event_type TEXT NOT NULL CHECK (event_type IN (
        'question_started', 'question_answered', 'question_skipped',
        'set_completed', 'help_requested', 'confidence_changed',
        'struggle_detected', 'session_joined', 'session_left'
    )),
    
    event_data JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX(session_id, timestamp),
    INDEX(user_id, timestamp)
);

-- Real-time triggers
CREATE OR REPLACE FUNCTION notify_progress_change()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'group_progress_update',
        json_build_object(
            'session_id', NEW.session_id,
            'user_id', NEW.user_id,
            'type', TG_OP,
            'data', row_to_json(NEW)
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER progress_update_trigger
    AFTER INSERT OR UPDATE ON group_quiz_progress
    FOR EACH ROW EXECUTE FUNCTION notify_progress_change();
```

## 🔄 Real-time Implementation

### Frontend Real-time Hook
```typescript
export function useProgressTracking(sessionId: string, userId: string) {
  const [progress, setProgress] = useState<Map<string, ParticipantProgress>>(new Map())
  const [groupSummary, setGroupSummary] = useState<GroupProgressSummary | null>(null)
  
  useEffect(() => {
    const channel = supabase
      .channel(`progress:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_quiz_progress',
          filter: `session_id=eq.${sessionId}`
        },
        handleProgressUpdate
      )
      .on(
        'broadcast',
        { event: 'progress_update' },
        handleBroadcastUpdate
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const updateProgress = useCallback(async (progressData: Partial<ParticipantProgress>) => {
    const { error } = await supabase
      .from('group_quiz_progress')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        ...progressData,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to update progress:', error)
    }
  }, [sessionId, userId])

  const recordEvent = useCallback(async (eventType: string, eventData: any) => {
    const { error } = await supabase
      .from('progress_events')
      .insert({
        session_id: sessionId,
        user_id: userId,
        event_type: eventType,
        event_data: eventData
      })

    if (error) {
      console.error('Failed to record progress event:', error)
    }
  }, [sessionId, userId])

  return {
    progress,
    groupSummary,
    updateProgress,
    recordEvent,
    isConnected: channel?.state === 'joined'
  }
}
```

### Backend Service
```typescript
class ProgressService {
  async getGroupProgress(sessionId: string): Promise<GroupProgressSummary> {
    const { data: participants } = await supabase
      .from('group_quiz_progress')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })

    return this.calculateGroupSummary(participants)
  }

  async updateParticipantProgress(
    sessionId: string,
    userId: string,
    update: Partial<ParticipantProgress>
  ): Promise<void> {
    // Update progress
    await supabase
      .from('group_quiz_progress')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        ...update,
        updated_at: new Date().toISOString()
      })

    // Record event
    await this.recordProgressEvent(sessionId, userId, 'progress_updated', update)

    // Check for struggle detection
    await this.detectStruggles(sessionId, userId, update)
  }

  private async detectStruggles(
    sessionId: string,
    userId: string,
    progress: Partial<ParticipantProgress>
  ): Promise<void> {
    const struggles: StruggleIndicator[] = []

    // Time-based struggle detection
    if (progress.timeSpent && progress.timeSpent > STRUGGLE_TIME_THRESHOLD) {
      struggles.push({
        type: 'time_spent',
        severity: this.calculateSeverity(progress.timeSpent),
        timestamp: new Date()
      })
    }

    // Update struggles if detected
    if (struggles.length > 0) {
      await supabase
        .from('group_quiz_progress')
        .update({
          struggling_indicators: struggles,
          updated_at: new Date().toISOString()
        })
        .match({ session_id: sessionId, user_id: userId })
    }
  }
}
```

## 🎨 UI Components

### ParticipantProgressCard Component
```typescript
interface ParticipantProgressCardProps {
  participant: ParticipantProgress
  isCurrentUser: boolean
  onHelpOffer?: (userId: string) => void
}

export function ParticipantProgressCard({
  participant,
  isCurrentUser,
  onHelpOffer
}: ParticipantProgressCardProps) {
  const progressPercentage = (participant.totalQuestionsAnswered / participant.currentQuestion) * 100

  return (
    <div className={`
      rounded-lg border p-3 transition-all
      ${isCurrentUser ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'}
      ${participant.helpRequested ? 'ring-2 ring-orange-400' : ''}
    `}>
      {/* User Avatar & Name */}
      <div className="flex items-center gap-3 mb-2">
        <div className="relative">
          <UserAvatar user={participant} size="sm" />
          <OnlineIndicator isOnline={participant.isOnline} />
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-sm">
            {participant.username}
            {isCurrentUser && <span className="text-indigo-600 ml-1">(You)</span>}
          </div>
          <div className="text-xs text-gray-500">
            Question {participant.currentQuestion} • Set {participant.currentSet}
          </div>
        </div>

        {participant.helpRequested && (
          <button
            onClick={() => onHelpOffer?.(participant.userId)}
            className="text-orange-600 hover:text-orange-700"
            title="Offer help"
          >
            <HandRaisedIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <ProgressBar
          percentage={progressPercentage}
          color={getProgressColor(participant.confidenceLevel)}
          showStripes={participant.strugglingIndicators.length > 0}
        />
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-2 text-xs">
        <ConfidenceIndicator level={participant.confidenceLevel} />
        
        {participant.strugglingIndicators.length > 0 && (
          <StruggleIndicator indicators={participant.strugglingIndicators} />
        )}
        
        <TimeSpentIndicator seconds={participant.timeSpent} />
      </div>
    </div>
  )
}
```

### GroupProgressSummary Component
```typescript
export function GroupProgressSummary({
  summary,
  onPacingAction
}: {
  summary: GroupProgressSummary
  onPacingAction?: (action: PacingAction) => void
}) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Group Progress</h3>
        <div className="text-sm text-gray-600">
          {summary.onlineParticipants}/{summary.totalParticipants} online
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-3">
        <ProgressBar
          percentage={summary.averageProgress}
          color="indigo"
          label={`${Math.round(summary.averageProgress)}% average progress`}
        />
      </div>

      {/* Progress Distribution */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="font-semibold">{summary.progressDistribution.notStarted}</div>
          <div className="text-gray-600">Not Started</div>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="font-semibold text-blue-600">{summary.progressDistribution.inProgress}</div>
          <div className="text-gray-600">In Progress</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="font-semibold text-green-600">{summary.progressDistribution.completed}</div>
          <div className="text-gray-600">Completed</div>
        </div>
      </div>

      {/* Insights & Actions */}
      {summary.difficultQuestions.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-orange-600 mb-1">
            Challenging Questions
          </div>
          <div className="text-xs text-gray-600">
            Questions {summary.difficultQuestions.join(', ')} need attention
          </div>
        </div>
      )}

      {summary.readyForNext && onPacingAction && (
        <button
          onClick={() => onPacingAction({ type: 'advance_group' })}
          className="w-full mt-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          Advance Group to Next Section
        </button>
      )}
    </div>
  )
}
```

## 📈 Performance Considerations

### Real-time Optimization
- **Debounced Updates:** Progress updates batched every 2-3 seconds
- **Selective Broadcasting:** Only send relevant changes to subscribers
- **Connection Pooling:** Efficient WebSocket connection management
- **Data Compression:** Minimal payload sizes for real-time events

### Scalability Measures
- **Horizontal Scaling:** Database read replicas for progress queries
- **Caching Layer:** Redis for frequently accessed group summaries
- **Event Sourcing:** Append-only progress events for audit and reconstruction
- **Background Processing:** Async calculation of complex analytics

This implementation provides a comprehensive real-time progress tracking system that enhances group learning experiences while maintaining performance and scalability.