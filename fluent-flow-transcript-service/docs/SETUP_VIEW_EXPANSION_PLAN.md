# Setup View Expansion Plan - Exercise Types & UI Enhancement

## 1. Current State Analysis

### Current Setup Structure:
- **Main Page**: `setup/page.tsx` - Handles permissions, navigation, and question generation orchestration
- **Preset Selection**: `GroupPresetSelectionView.tsx` - Shows 6 intelligent presets for multiple choice questions
- **Question Types**: Currently only supports **Multiple Choice Questions (MCQ)**
- **Generation Flow**: Preset → Generate Questions → Preview → Start Quiz

### Current Presets:
1. Beginner Friendly (8 easy, 3 medium, 1 hard)
2. Balanced Learning (5 easy, 6 medium, 5 hard) 
3. Challenge Mode (2 easy, 5 medium, 7 hard)
4. Quick Review (3 easy, 4 medium, 2 hard)
5. Comprehensive (6 easy, 8 medium, 6 hard)
6. Custom Generation (manual difficulty selection)

## 2. Proposed Exercise Types for Effective Listening Practice

### A. Fill in the Blank (Cloze)
**Purpose**: Tests specific vocabulary, grammar, and detailed comprehension
**Types**:
- **Single Word Fill**: Missing key vocabulary
- **Phrase Fill**: Missing expressions or collocations  
- **Grammar Fill**: Missing function words, verb forms, articles
- **Number/Date Fill**: Missing specific information

**Implementation**:
```typescript
interface FillBlankQuestion {
  id: string
  type: 'fill-blank'
  subType: 'single-word' | 'phrase' | 'grammar' | 'specific-info'
  transcript: string
  blanks: BlankItem[]
  audioSegment: AudioSegment
  difficulty: 'easy' | 'medium' | 'hard'
}

interface BlankItem {
  position: number // Character position in transcript
  length: number // Length of blank
  answer: string
  alternatives?: string[] // Accept alternative answers
  caseSensitive?: boolean
}
```

### B. Dictation
**Purpose**: Tests precise listening and spelling accuracy
**Types**:
- **Sentence Dictation**: Complete sentences (5-15 words)
- **Passage Dictation**: Paragraph-level (30-60 words)
- **Spot Dictation**: Key phrases within longer context

### C. True/False/Not Given
**Purpose**: Tests detailed comprehension and inference
**Focus**: Information explicitly stated, implied, or missing

### D. Sequencing/Ordering
**Purpose**: Tests understanding of chronological order, process steps
**Types**:
- **Event Ordering**: Arrange events in correct sequence
- **Process Steps**: Order steps in a procedure
- **Argument Flow**: Order points in a logical argument

### E. Matching
**Purpose**: Tests association and categorization skills
**Types**:
- **Speaker Matching**: Match statements to speakers
- **Topic Matching**: Match segments to topics/categories
- **Cause-Effect Matching**: Match causes with effects

### F. Short Answer Questions
**Purpose**: Tests comprehension and ability to extract specific information
**Types**:
- **Factual Questions**: Who, what, when, where
- **Numerical Information**: Times, dates, quantities
- **Opinion/Attitude**: What does speaker think about X?

### G. Note-Taking/Summary
**Purpose**: Tests ability to identify main points and organize information
**Types**:
- **Guided Notes**: Fill in structured outline
- **Free-Form Summary**: Write key points in own words
- **Table Completion**: Fill in structured data

## 3. UI/UX Design Plan

### 3.1 New Setup Flow Architecture

```
Setup Page
├── Exercise Type Selection (NEW)
│   ├── Multiple Choice
│   ├── Fill in the Blank
│   ├── Dictation
│   ├── True/False/Not Given
│   ├── Sequencing
│   ├── Matching
│   ├── Short Answer
│   └── Mixed Practice
├── Difficulty & Quantity Selection
│   ├── Preset-based (Enhanced)
│   └── Custom Configuration
└── Generate & Preview
```

### 3.2 Enhanced Preset System

**Current Presets** → **Exercise-Specific Presets**:

**Multiple Choice Presets** (Current):
- Beginner Friendly, Balanced Learning, Challenge Mode, etc.

**Fill-in-the-Blank Presets** (NEW):
- Vocabulary Focus (target key words)
- Grammar Focus (target function words, verb forms)
- Detail Focus (numbers, names, specific info)
- Mixed Focus (combination of above)

**Dictation Presets** (NEW):
- Short Sentences (5-10 words)
- Medium Passages (20-40 words)
- Long Passages (50+ words)
- Speed Variations (normal/fast speech)

### 3.3 UI Components Structure

```typescript
// New component hierarchy
SetupPage
├── ExerciseTypeSelector (NEW)
├── PresetSelector (Enhanced)
│   ├── MCQPresetGrid
│   ├── FillBlankPresetGrid (NEW)
│   ├── DictationPresetGrid (NEW)
│   └── MixedExercisePresetGrid (NEW)
├── CustomConfigPanel (Enhanced)
└── GenerationControls
```

### 3.4 Exercise Type Selector Design

**Visual Design**:
- **Cards Layout**: Similar to current preset cards
- **Icons**: Distinctive icons for each exercise type
- **Descriptions**: Clear explanation of what each type practices
- **Difficulty Indicators**: Show recommended skill levels

**Interaction**:
- Single selection or multi-selection modes
- Preview examples for each type
- Estimated time and difficulty indication

## 4. Implementation Plan

### Phase 1: Foundation (Week 1)
1. **Create Exercise Type Data Models**
   - Define TypeScript interfaces for all exercise types
   - Create database schema extensions
   - Update question generation API

2. **UI Component Development**
   - `ExerciseTypeSelector` component
   - Enhanced `PresetSelector` with exercise-specific presets
   - Update `GroupPresetSelectionView` architecture

### Phase 2: Fill-in-the-Blank Implementation (Week 2)
1. **Backend Logic**
   - Implement blank detection algorithms
   - Create fill-blank question generation
   - Add answer validation logic

2. **Frontend Components**
   - `FillBlankQuestion` display component
   - `FillBlankPresetGrid` configuration
   - Answer input and validation UI

### Phase 3: Dictation Implementation (Week 3)
1. **Backend Logic**
   - Audio segmentation for dictation
   - Transcript processing for dictation passages
   - Spelling and accuracy scoring

2. **Frontend Components**
   - `DictationQuestion` display component
   - Audio playback controls with replay limits
   - Text input with real-time feedback

### Phase 4: Additional Exercise Types (Week 4)
1. **True/False/Not Given**
2. **Sequencing/Ordering**
3. **Matching**
4. **Short Answer**

### Phase 5: Advanced Features (Week 5)
1. **Mixed Exercise Sessions**
2. **Adaptive Difficulty**
3. **Performance Analytics**
4. **Custom Exercise Creation**

## 5. Technical Considerations

### 5.1 Database Schema Changes
```sql
-- Add exercise_type to quiz_sessions
ALTER TABLE quiz_sessions 
ADD COLUMN exercise_type VARCHAR(50) DEFAULT 'multiple-choice';

-- New table for exercise configurations
CREATE TABLE exercise_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id),
  exercise_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

### 5.2 API Endpoints Extensions
```typescript
// Enhanced question generation
POST /api/groups/{groupId}/sessions/{sessionId}/generate-questions
{
  exerciseType: 'fill-blank' | 'dictation' | 'multiple-choice' | 'mixed',
  difficulty: 'easy' | 'medium' | 'hard',
  count: number,
  config: ExerciseSpecificConfig
}

// Exercise type validation
POST /api/groups/{groupId}/sessions/{sessionId}/validate-answer
{
  questionId: string,
  exerciseType: string,
  answer: any,
  metadata?: any
}
```

### 5.3 Performance Considerations
- **Lazy Loading**: Load exercise-specific components only when needed
- **Caching**: Cache generated questions by exercise type
- **Audio Optimization**: Compress audio for dictation exercises
- **Progressive Enhancement**: Fallback to MCQ if advanced features fail

## 6. User Experience Flow

### 6.1 Enhanced Setup Flow
1. **Select Exercise Type(s)**
   - Visual cards with examples
   - Multi-select for mixed practice
   - Difficulty recommendations per type

2. **Configure Exercise Parameters**
   - Exercise-specific presets
   - Custom quantity/difficulty sliders
   - Preview sample questions

3. **Generate Questions**
   - Type-specific generation progress
   - Preview generated questions
   - Option to regenerate specific types

4. **Start Practice Session**
   - Seamless transition to practice
   - Type-specific instructions
   - Adaptive difficulty based on performance

### 6.2 Mixed Exercise Sessions
- **Balanced Mix**: Equal distribution of exercise types
- **Skill-Focused**: Emphasis on specific skills (vocabulary, grammar, etc.)
- **Progressive Difficulty**: Start easy, increase complexity
- **Adaptive**: Adjust based on user performance

## 7. Success Metrics

### 7.1 User Engagement
- **Exercise Type Usage**: Which types are most popular
- **Session Completion Rates**: By exercise type
- **User Preferences**: Track preferred combinations

### 7.2 Learning Effectiveness
- **Score Improvements**: Track progress by exercise type
- **Time to Completion**: Efficiency metrics
- **Error Patterns**: Identify common mistakes

### 7.3 Technical Performance
- **Generation Speed**: Time to create different exercise types
- **Answer Validation Accuracy**: Correct/incorrect answer detection
- **User Interface Responsiveness**: Interaction smoothness

## 8. Risk Mitigation

### 8.1 Complexity Management
- **Phased Rollout**: Implement one exercise type at a time
- **Feature Flags**: Enable/disable exercise types per user group
- **Fallback Mechanisms**: Default to MCQ if new types fail

### 8.2 Performance Risks
- **Question Generation Load**: Monitor server resources
- **Database Growth**: Plan for increased data volume
- **Client-Side Performance**: Optimize rendering for complex exercises

### 8.3 User Adoption
- **Gradual Introduction**: Don't overwhelm users with too many options
- **Clear Instructions**: Provide examples and tutorials
- **Feedback Loop**: Collect user feedback early and often

---

**Next Steps**: 
1. Review and approve this plan
2. Create detailed technical specifications for Phase 1
3. Set up development environment for new exercise types
4. Begin implementation of foundation components