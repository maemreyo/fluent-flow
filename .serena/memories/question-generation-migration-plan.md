# Kế hoạch Di chuyển Logic Generate Question từ Extension sang Next.js

## Tóm tắt hiện trạng

### 1. Extension (Browser Extension)
**Vị trí:** `/lib/services/ai-service.ts`
- **AIService class**: Chứa logic generate questions qua `generateConversationQuestions()` method
- **AI Prompts**: Định nghĩa trong `/lib/services/ai-prompts.ts` với `conversationQuestionsPrompt` 
- **Multi-provider support**: OpenAI, Anthropic, Google Gemini
- **Features hiện có**:
  - Generate questions với difficulty distribution (easy/medium/hard)
  - Question types: main_idea, specific_detail, vocabulary_in_context, inference, speaker_tone, language_function
  - Shuffling options với seeded randomization
  - JSON output parsing và validation

### 2. Next.js Project
**Vị trí:** `/fluent-flow-transcript-service/src/lib/services/`
- **ExtensionBridge**: Communication layer giữa extension và webapp
- **SharedQuestions**: Service để lưu và chia sẻ question sets
- **Supabase integration**: Database layer cho persistence
- **Group/Session management**: Đã có infrastructure cho group quizzes

## Kế hoạch Di chuyển (Migration Plan)

### Phase 1: Core AI Services Migration
**Timeline: 1-2 days**

#### 1.1. Tạo AI Service trong Next.js
```
fluent-flow-transcript-service/src/lib/services/ai-service.ts
```
- Copy và adapt `AIService` class từ extension
- Adapt cho Next.js environment (server-side, no browser restrictions)  
- Keep multi-provider support (OpenAI, Anthropic, Google)
- Add environment variable configuration

#### 1.2. Tạo AI Prompts Service
```
fluent-flow-transcript-service/src/lib/services/ai-prompts.ts
```
- Copy prompt templates từ extension
- Enhance prompts cho server-side generation
- Add localization support (English/Vietnamese)

#### 1.3. Dependencies & Configuration
- Add AI provider SDKs to package.json
- Configure environment variables (.env.example)
- Add TypeScript types cho AI responses

### Phase 2: Question Generation API
**Timeline: 2-3 days**

#### 2.1. Tạo API Routes
```
/api/questions/generate
/api/questions/generate-from-transcript  
/api/questions/bulk-generate
```

#### 2.2. Question Generation Service
```
fluent-flow-transcript-service/src/lib/services/question-generation-service.ts
```
- Wrapper around AIService
- Input validation và sanitization
- Output standardization
- Error handling và retry logic
- Rate limiting integration

#### 2.3. Integration với Existing Services
- Extend `SharedQuestionsService` để support generated questions
- Add question generation metadata tracking
- Integration với group sessions

### Phase 3: Database Schema & Models
**Timeline: 1-2 days**

#### 3.1. Supabase Schema Extensions
```sql
-- Thêm columns vào existing tables
ALTER TABLE shared_question_sets ADD COLUMN generation_method TEXT;
ALTER TABLE shared_question_sets ADD COLUMN ai_provider TEXT;
ALTER TABLE shared_question_sets ADD COLUMN generation_settings JSONB;

-- Tạo table cho generation history  
CREATE TABLE question_generation_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  input_type TEXT, -- 'transcript', 'url', 'text'
  input_data JSONB,
  output_questions JSONB,
  generation_settings JSONB,
  ai_provider TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2. TypeScript Types
- Update existing interfaces
- Add new types cho generation requests/responses
- Add validation schemas

### Phase 4: User Interface Integration  
**Timeline: 2-3 days**

#### 4.1. Question Generation UI Components
```
fluent-flow-transcript-service/src/components/question-generation/
├── GenerateQuestionsModal.tsx
├── QuestionPreview.tsx  
├── GenerationSettings.tsx
├── AIProviderSelector.tsx
└── TranscriptInput.tsx
```

#### 4.2. Integration Points
- Add "Generate Questions" button trong group sessions
- Integration với existing quiz creation flow
- Enhance session management với AI-generated content

#### 4.3. Settings & Configuration UI
- AI provider selection
- Generation presets management
- User preferences cho question types/difficulty

### Phase 5: Extension Bridge Enhancement
**Timeline: 1-2 days**

#### 5.1. Extend ExtensionBridgeService
- Add message types cho question generation requests
- Bridge communication between extension và webapp
- Sync generated questions back to extension

#### 5.2. Backward Compatibility
- Keep existing extension functionality
- Gradual migration strategy
- Feature flags cho testing

### Phase 6: Testing & Optimization
**Timeline: 2-3 days**

#### 6.1. Testing Strategy
- Unit tests cho AI services
- Integration tests cho API routes
- E2E tests cho UI flows
- Load testing cho AI generation

#### 6.2. Performance Optimization
- Caching strategies cho generated questions
- Background job processing cho bulk generation  
- Rate limiting và queue management

## Technical Implementation Details

### 1. AI Service Architecture
```typescript
// fluent-flow-transcript-service/src/lib/services/ai-service.ts
export class AIService {
  private providers: Map<string, AIProvider>
  
  async generateQuestions(
    transcript: string,
    options: GenerationOptions
  ): Promise<GeneratedQuestions>
  
  async generateQuestionsFromLoop(
    loop: SavedLoop,
    transcript: string, 
    preset: DifficultyPreset
  ): Promise<GeneratedQuestions>
}
```

### 2. API Routes Structure
```typescript
// /api/questions/generate
export async function POST(request: NextRequest) {
  // Input validation
  // AI service initialization  
  // Question generation
  // Response formatting
  // Error handling
}
```

### 3. Database Integration
```typescript
// Enhanced SharedQuestionsService
export class SharedQuestionsService {
  async createFromGenerated(
    generatedQuestions: GeneratedQuestions,
    metadata: GenerationMetadata
  ): Promise<SharedQuestionSet>
}
```

### 4. Extension Bridge Messages
```typescript
// New message types
interface GenerateQuestionsMessage {
  type: 'FLUENT_FLOW_GENERATE_QUESTIONS'
  data: {
    transcript: string
    options: GenerationOptions
  }
}

interface QuestionsGeneratedMessage {
  type: 'FLUENT_FLOW_QUESTIONS_GENERATED'
  data: {
    questions: GeneratedQuestions
    shareToken: string
  }
}
```

## Migration Benefits

### 1. Centralized Logic
- Single source of truth cho question generation
- Easier maintenance và updates
- Consistent behavior across extension và webapp

### 2. Enhanced Capabilities  
- Server-side processing power
- Better error handling và retry logic
- Database persistence và analytics
- Multi-user collaboration

### 3. Scalability
- API-based architecture
- Background processing capability
- Rate limiting và resource management
- Caching strategies

### 4. User Experience
- Faster processing (server-side)
- Better error messages
- Progress tracking
- Question history và reuse

## Risk Mitigation

### 1. Backward Compatibility
- Keep extension functionality intact during migration
- Feature flags cho gradual rollout
- Fallback mechanisms

### 2. Performance
- Implement caching strategies  
- Background job processing
- Rate limiting để prevent abuse

### 3. Cost Management
- Monitor AI API usage
- Implement usage limits
- Optimize prompt efficiency

### 4. Data Privacy
- Secure transcript handling
- User consent cho AI processing
- Data retention policies

## Success Metrics

1. **Migration Success**: Extension functionality moved to Next.js without regressions
2. **Performance**: Question generation < 30 seconds for typical transcripts
3. **Reliability**: 99%+ success rate cho question generation  
4. **User Adoption**: Users actively using webapp-generated questions
5. **Cost Efficiency**: AI API costs within budget constraints

## Next Steps

1. **Immediate**: Start Phase 1 - Core AI Services Migration
2. **Week 1**: Complete Phases 1-2 (AI Services + API Routes)  
3. **Week 2**: Complete Phases 3-4 (Database + UI)
4. **Week 3**: Complete Phases 5-6 (Bridge + Testing)
5. **Week 4**: Production deployment và user testing