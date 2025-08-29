# Vocabulary Learning Actions & User Engagement Strategies

## Current User Actions Analysis

### Existing Basic Actions
1. **Audio Pronunciation** - Play word/phrase pronunciation
2. **Language Toggle** - Switch between English/Vietnamese definitions
3. **Expand/Collapse** - Show detailed information

### Missing Essential Learning Actions

#### 1. **Spaced Repetition System (SRS)**
- **Mark as Learning** - Add to personal vocabulary deck
- **Difficulty Rating** - "Easy/Hard" feedback after viewing
- **Review Schedule** - Smart reminders based on forgetting curve
- **Progress Tracking** - Track learning status per word

#### 2. **Active Practice Methods**
- **Flashcard Mode** - Show word → recall definition
- **Contextual Usage** - Generate sentences with the word
- **Audio Recognition** - Listen → identify the word
- **Spelling Practice** - Type the word from pronunciation

#### 3. **Contextual Learning**
- **Save to Loop** - Associate words with specific video segments
- **Usage Examples** - More examples from real content
- **Collocation Practice** - Common word combinations
- **Similar Context** - Find other videos with same word

#### 4. **Social & Gamification**
- **Share Word** - Share interesting words with others
- **Word Streaks** - Daily vocabulary learning streaks  
- **Achievement Badges** - Unlock rewards for learning milestones
- **Study Groups** - Learn vocabulary with peers

#### 5. **Advanced Learning Tools**
- **Word Families** - Show related words (derivations, inflections)
- **Etymology** - Word origin and history
- **Usage Trends** - How common/formal the word is
- **Register Analysis** - Formal vs informal usage

## Recommended Implementation Priority

### Phase 1: Core SRS Features
1. **"Add to My Vocabulary"** button
2. **Learning status tracking** (new → learning → mastered)
3. **Simple review reminders**

### Phase 2: Practice Methods
1. **Flashcard mode** for vocabulary review
2. **Contextual examples** generation
3. **Audio practice** with speech recognition

### Phase 3: Advanced Features
1. **Word relationship mapping** (synonyms, antonyms, families)
2. **Usage statistics** and progress analytics
3. **Social learning features**

## UI/UX Recommendations

### Current Compact View Should Show:
- Word + Part of Speech + Pronunciation (✓ implemented)
- Learning status indicator (new feature)
- Quick action buttons (audio ✓, add to deck)

### Expanded View Should Include:
- Definition with language toggle (✓ implemented)  
- Examples and usage context (✓ implemented)
- Learning actions panel (new feature)
- Progress indicators (new feature)

### New Learning Panel Structure:
```
[Add to My Vocabulary] [Mark as Difficult] [Practice Now]
[Generate More Examples] [Find Similar Usage] [Share]
Progress: ⚪⚪⚪⚫⚫ (2/5 reviews completed)
Next review: Tomorrow at 2 PM
```

## Database Schema Additions Needed

### User Vocabulary Table
- user_id, word_id, loop_id
- learning_status (new, learning, mastered)
- difficulty_rating (1-5)
- review_count, success_rate
- next_review_date
- first_seen_date, last_reviewed_date

### Vocabulary Practice Sessions
- session_id, user_id, vocabulary_id
- practice_type (flashcard, audio, spelling, etc.)
- result (correct/incorrect)
- response_time, confidence_level

## Engagement Psychology Principles

### 1. **Progressive Disclosure**
- Start with simple view → reveal complexity on demand
- Guided learning path from basic to advanced

### 2. **Immediate Feedback**
- Instant pronunciation playback
- Visual progress indicators
- Success animations and confirmations  

### 3. **Personalization**
- Adaptive difficulty based on user performance
- Personalized review schedules
- Interest-based vocabulary recommendations

### 4. **Social Learning**
- Share progress and achievements
- Learn from community-generated examples
- Collaborative vocabulary lists

### 5. **Contextual Relevance**
- Connect words to video content user watched
- Real-world usage examples
- Personal interest alignment

## Success Metrics to Track

1. **Engagement Metrics**
   - Words added to personal vocabulary
   - Daily/weekly active learning sessions
   - Review completion rates

2. **Learning Effectiveness**
   - Retention rates over time
   - Progression from "learning" to "mastered"
   - Application in user-generated content

3. **Feature Usage**
   - Most used learning actions
   - Time spent in vocabulary sections
   - User-preferred practice methods

This comprehensive approach transforms passive vocabulary viewing into active, engaging learning experiences that promote long-term retention and practical usage.