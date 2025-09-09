# Quiz Flow Architecture

## Application States & Navigation
- `loading` → Initial state
- `preset-selection` → Setup screen (generate questions) 
- `question-info` → Info screen (quiz overview)
- `question-preview` → Preview screen (browse questions)
- `quiz-active` → Active screen (take quiz)
- `quiz-results` → Results screen

## Navigation Flow
1. **Setup** (`/setup`) - Owner configures presets → generates questions → `info`
2. **Lobby** (`/lobby`) - Members wait for owner to start → `info` 
3. **Info** (`/info`) - Show quiz summary → `preview`
4. **Preview** (`/preview`) - Browse questions → `active`
5. **Active** (`/active`) - Take quiz with sets (Easy→Medium→Hard) → `results`
6. **Results** (`/results`) - Final scores

## Key Technical Details
- **State Persistence**: sessionStorage with key `quiz-app-state-${sessionId}`
- **Question Caching**: TanStack Query with 30min stale time across pages
- **Real-time**: Supabase channels for participant sync
- **Permissions**: Owner/Admin (setup) vs Members (lobby→quiz flow)

## Recent Fixes (Dec 2024)
- Fixed duplicate API calls by consolidating to useSharedQuestions hook
- Fixed question state reset when switching sets by filtering responses to current set
- Implemented proper state persistence across navigation

## Critical Files
- `useGroupQuiz.ts` - Main state management
- `useQuizFlow.ts` - Navigation logic  
- `GroupQuizActiveView.tsx` - Quiz taking interface
- `QuestionNavigationBar.tsx` - Question indicators
- `providers.tsx` - Query client with persistence