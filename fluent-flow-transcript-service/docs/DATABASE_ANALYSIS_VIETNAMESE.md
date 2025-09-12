# Phân Tích Database Schema và Kế Hoạch Tích Hợp Exercise Types Mới

## 1. Tổng Quan Database Hiện Tại

### 1.1 Các Tables Liên Quan Đến Quiz System

**Tables chính:**
- `group_quiz_sessions` - Quản lý phiên quiz nhóm
- `shared_question_sets` - Lưu trữ câu hỏi được share (156 rows)
- `group_quiz_results` - Kết quả quiz của từng user (14 rows)
- `group_quiz_progress` - Theo dõi tiến độ làm bài (14 rows) 
- `custom_prompts` - Prompts tùy chỉnh cho AI (3 rows)

### 1.2 Cấu Trúc Questions Hiện Tại

Từ dữ liệu mẫu trong `shared_question_sets.questions`, các câu hỏi hiện tại có format:

```json
{
  "id": "q_747e983b-2e66-486b-a4f1-c7d7b97177ae_ai_1",
  "type": "specific_detail",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "question": "What does the speaker say...",
  "timestamp": 1.355649,
  "difficulty": "easy",
  "explanation": "The speaker explicitly states...",
  "correctAnswer": "A"
}
```

**Các loại type hiện có:**
- `specific_detail` - Chi tiết cụ thể
- `vocabulary_in_context` - Từ vựng trong ngữ cảnh
- `inference` - Suy luận
- `main_idea` - Ý chính
- `speaker_tone` - Thái độ của người nói
- `language_function` - Chức năng ngôn ngữ

## 2. Phân Tích Khả Năng Mở Rộng

### 2.1 Ưu Điểm của Schema Hiện Tại

✅ **Linh hoạt với JSONB:** 
- `questions` field sử dụng JSONB → có thể chứa nhiều format khác nhau
- `metadata` field cho mỗi table → dễ mở rộng thông tin

✅ **Có sẵn type field:** 
- Đã có `type` trong question structure
- Có thể thêm exercise types mới mà không breaking changes

✅ **Timestamp support:** 
- Đã có `timestamp` field → support audio-based exercises

### 2.2 Hạn Chế Cần Khắc Phục

❌ **Chỉ support Multiple Choice:**
- Format hiện tại chỉ có `options[]` và `correctAnswer`
- Cần mở rộng để support các exercise types khác

❌ **Thiếu Exercise Configuration:**
- Không có table để config exercise types
- Settings hiện tại chỉ ở session level

❌ **Không có Answer Validation Logic:**
- Chỉ có simple A/B/C/D matching
- Cần logic phức tạp cho fill-blank, dictation, etc.

## 3. Kế Hoạch Tích Hợp Exercise Types Mới

### 3.1 Chiến Lược Backward Compatible

**Không thay đổi existing tables**, chỉ extend:

1. **Mở rộng question format trong JSONB**
2. **Thêm validation logic ở application layer**
3. **Sử dụng `metadata` field cho exercise-specific config**

### 3.2 Extended Question Formats

#### Multiple Choice (Hiện tại - không thay đổi)
```json
{
  "id": "q_uuid_1",
  "type": "multiple-choice",
  "exerciseSubType": "specific_detail",
  "question": "What does the speaker say...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "A",
  "timestamp": 1.355,
  "difficulty": "easy",
  "explanation": "..."
}
```

#### Fill in the Blank (MỚI)
```json
{
  "id": "q_uuid_2", 
  "type": "fill-blank",
  "exerciseSubType": "single-word",
  "transcript": "The speaker mentions that evening is a gateway to your _____ growth.",
  "blanks": [
    {
      "position": 65,
      "length": 8,
      "answer": "spiritual",
      "alternatives": ["personal", "inner"],
      "caseSensitive": false
    }
  ],
  "audioSegment": {
    "start": 1.355,
    "end": 5.223
  },
  "timestamp": 1.355,
  "difficulty": "medium",
  "explanation": "..."
}
```

#### Dictation (MỚI)
```json
{
  "id": "q_uuid_3",
  "type": "dictation", 
  "exerciseSubType": "sentence",
  "audioSegment": {
    "start": 10.5,
    "end": 15.2
  },
  "targetText": "Your evening is either a gateway to your spiritual growth.",
  "allowedPlaybacks": 3,
  "difficulty": "hard",
  "validation": {
    "ignoreCase": true,
    "ignorePunctuation": true,
    "similarityThreshold": 0.8
  }
}
```

#### True/False/Not Given (MỚI)
```json
{
  "id": "q_uuid_4",
  "type": "true-false-not-given",
  "statement": "The speaker says most people become more spiritual after work.",
  "correctAnswer": "false",
  "timestamp": 9.189,
  "difficulty": "easy",
  "explanation": "The speaker says most people 'clock out spiritually'..."
}
```

### 3.3 Database Schema Extensions

#### Option 1: Minimal Changes (KHUYẾN NGHỊ)
Không thêm table mới, chỉ extend existing structure:

```sql
-- Extend group_quiz_sessions để support exercise types
ALTER TABLE group_quiz_sessions 
ADD COLUMN exercise_types JSONB DEFAULT '["multiple-choice"]'::jsonb;

-- Extend custom_prompts để support exercise-specific prompts  
ALTER TABLE custom_prompts
ADD COLUMN supported_exercise_types JSONB DEFAULT '["multiple-choice"]'::jsonb;

-- Add indexes cho performance
CREATE INDEX idx_shared_questions_exercise_type 
ON shared_question_sets USING gin ((questions::jsonb));
```

#### Option 2: Comprehensive Changes (Nếu cần chi tiết hơn)
```sql
-- Table mới cho exercise configurations
CREATE TABLE exercise_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES group_quiz_sessions(id) ON DELETE CASCADE,
  exercise_type VARCHAR(50) NOT NULL,
  sub_type VARCHAR(50),
  config JSONB NOT NULL DEFAULT '{}',
  question_count INTEGER DEFAULT 5,
  difficulty_distribution JSONB DEFAULT '{"easy":2,"medium":2,"hard":1}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table cho answer validation rules
CREATE TABLE answer_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  exercise_type VARCHAR(50) NOT NULL,
  validation_schema JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 Answer Validation Logic

#### Multiple Choice (Hiện tại)
```typescript
interface MCQAnswer {
  questionId: string
  selectedOption: string // "A", "B", "C", "D"  
}

function validateMCQ(answer: MCQAnswer, question: MCQQuestion): boolean {
  return answer.selectedOption === question.correctAnswer
}
```

#### Fill in the Blank (MỚI)
```typescript  
interface FillBlankAnswer {
  questionId: string
  answers: { [position: number]: string }
}

function validateFillBlank(answer: FillBlankAnswer, question: FillBlankQuestion): {
  isCorrect: boolean
  score: number
  feedback: BlankFeedback[]
} {
  // Logic để check từng blank
  // Support alternatives, case sensitivity, etc.
}
```

#### Dictation (MỚI) 
```typescript
interface DictationAnswer {
  questionId: string
  transcribedText: string
  playbacksUsed: number
}

function validateDictation(answer: DictationAnswer, question: DictationQuestion): {
  isCorrect: boolean
  similarityScore: number
  errors: DictationError[]
} {
  // Sử dụng string similarity algorithms
  // Levenshtein distance, fuzzy matching, etc.
}
```

## 4. API Endpoints Modifications

### 4.1 Question Generation API
```typescript
// BEFORE
POST /api/groups/{groupId}/sessions/{sessionId}/generate-questions
{
  difficulty: 'easy' | 'medium' | 'hard',
  count: number,
  preset?: string
}

// AFTER (Extended)
POST /api/groups/{groupId}/sessions/{sessionId}/generate-questions  
{
  exerciseTypes: ('multiple-choice' | 'fill-blank' | 'dictation' | 'true-false')[],
  difficulty: 'easy' | 'medium' | 'hard', 
  count: number,
  distribution?: {
    'multiple-choice': number,
    'fill-blank': number,
    'dictation': number
  },
  preset?: string,
  config?: ExerciseConfig
}
```

### 4.2 Answer Validation API
```typescript
// MỚI
POST /api/groups/{groupId}/sessions/{sessionId}/validate-answer
{
  questionId: string,
  exerciseType: string,
  answer: any, // Depends on exercise type
  metadata?: {
    timeSpent?: number,
    playbacksUsed?: number,
    confidence?: 'low' | 'medium' | 'high'
  }
}

Response: {
  isCorrect: boolean,
  score: number,
  feedback: string,
  detailedFeedback?: any,
  nextQuestion?: QuestionReference
}
```

## 5. Migration Strategy

### Phase 1: Infrastructure (Tuần 1)
1. **Extend existing question format** để support exercise types mới
2. **Add validation logic** ở application layer
3. **Update TypeScript interfaces** cho frontend/backend

### Phase 2: Fill-in-the-Blank (Tuần 2) 
1. **Implement generation logic** cho fill-blank questions
2. **Add frontend components** cho fill-blank UI
3. **Update answer validation** 

### Phase 3: Dictation (Tuần 3)
1. **Audio segment processing**
2. **Dictation UI với audio controls**
3. **String similarity validation**

### Phase 4: Additional Types (Tuần 4-5)
1. **True/False/Not Given**
2. **Sequencing/Ordering** 
3. **Matching exercises**

## 6. Rủi Ro và Mitigation

### 6.1 Performance Risks
**Vấn đề:** JSONB queries có thể chậm với dataset lớn
**Giải pháp:** 
- Add GIN indexes trên JSONB fields
- Cache generated questions
- Pagination cho question sets

### 6.2 Data Consistency 
**Vấn đề:** Mixed exercise types trong cùng 1 session
**Giải pháp:**
- Validate exercise compatibility
- Clear separation trong UI
- Session-level exercise type configuration

### 6.3 Backward Compatibility
**Vấn đề:** Existing questions có thể break với new validation logic  
**Giải pháp:**
- Feature flags cho exercise types
- Graceful fallback to MCQ
- Migration scripts cho existing data

## 7. Testing Strategy

### 7.1 Database Testing
- Test JSONB query performance
- Validate exercise type combinations  
- Test answer validation accuracy

### 7.2 Integration Testing
- Cross-exercise type sessions
- Mixed difficulty distributions
- User progression tracking

### 7.3 Performance Testing
- Large question sets generation
- Concurrent user answer validation
- Audio processing load testing

## 8. Next Steps

### Immediate Actions (Tuần tới)
1. ✅ **Implement extended question format** trong codebase
2. ✅ **Create TypeScript interfaces** cho new exercise types
3. ✅ **Update AI generation prompts** để support exercise types
4. ✅ **Add database migrations** (nếu cần)

### Development Priority
1. **Fill-in-the-Blank** - Easiest to implement
2. **Dictation** - Most valuable cho listening practice
3. **True/False/Not Given** - Good variety  
4. **Advanced types** - Matching, Sequencing, etc.

---

**Kết luận:** Database schema hiện tại rất linh hoạt với JSONB, cho phép extend exercise types mà không cần major structural changes. Strategy tốt nhất là gradual rollout với backward compatibility.