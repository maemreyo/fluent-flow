'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface LearningSettingsFormProps {
  language: string
  level: string
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  showCorrectAnswers: boolean
  defaultQuizTimeLimit: number
  enforceQuizTimeLimit: boolean
  allowSkippingQuestions: boolean
  onLanguageChange: (value: string) => void
  onLevelChange: (value: string) => void
  onShuffleQuestionsChange: (value: boolean) => void
  onShuffleAnswersChange: (value: boolean) => void
  onShowCorrectAnswersChange: (value: boolean) => void
  onDefaultQuizTimeLimitChange: (value: number) => void
  onEnforceQuizTimeLimitChange: (value: boolean) => void
  onAllowSkippingQuestionsChange: (value: boolean) => void
}

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
]

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export function LearningSettingsForm({
  language,
  level,
  shuffleQuestions,
  shuffleAnswers,
  showCorrectAnswers,
  defaultQuizTimeLimit,
  enforceQuizTimeLimit,
  allowSkippingQuestions,
  onLanguageChange,
  onLevelChange,
  onShuffleQuestionsChange,
  onShuffleAnswersChange,
  onShowCorrectAnswersChange,
  onDefaultQuizTimeLimitChange,
  onEnforceQuizTimeLimitChange,
  onAllowSkippingQuestionsChange
}: LearningSettingsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language-select">Language</Label>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger id="language-select">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="level-select">Level</Label>
            <Select value={level} onValueChange={onLevelChange}>
              <SelectTrigger id="level-select">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((lvl) => (
                  <SelectItem key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t">
          <h4 className="font-medium text-sm text-muted-foreground">Enhanced Quiz Settings</h4>
          
          {/* Shuffle Questions */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="shuffle-questions">Shuffle Questions</Label>
              <p className="text-sm text-muted-foreground">
                Randomize question order for each participant in quiz sessions
              </p>
            </div>
            <Switch
              id="shuffle-questions"
              checked={shuffleQuestions}
              onCheckedChange={onShuffleQuestionsChange}
            />
          </div>

          {/* Shuffle Answers */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="shuffle-answers">Shuffle Answers</Label>
              <p className="text-sm text-muted-foreground">
                Randomize answer choices for each question
              </p>
            </div>
            <Switch
              id="shuffle-answers"
              checked={shuffleAnswers}
              onCheckedChange={onShuffleAnswersChange}
            />
          </div>

          {/* Show Correct Answers */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-correct-answers">Show Correct Answers</Label>
              <p className="text-sm text-muted-foreground">
                Display correct answers after quiz completion
              </p>
            </div>
            <Switch
              id="show-correct-answers"
              checked={showCorrectAnswers}
              onCheckedChange={onShowCorrectAnswersChange}
            />
          </div>

          {/* Allow Skipping Questions */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="allow-skipping">Allow Skipping Questions</Label>
              <p className="text-sm text-muted-foreground">
                Let participants skip difficult questions and return later
              </p>
            </div>
            <Switch
              id="allow-skipping"
              checked={allowSkippingQuestions}
              onCheckedChange={onAllowSkippingQuestionsChange}
            />
          </div>

          {/* Time Limit Settings */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enforce-time-limit">Enforce Quiz Time Limit</Label>
                <p className="text-sm text-muted-foreground">
                  Set a time limit for quiz completion
                </p>
              </div>
              <Switch
                id="enforce-time-limit"
                checked={enforceQuizTimeLimit}
                onCheckedChange={onEnforceQuizTimeLimitChange}
              />
            </div>

            {enforceQuizTimeLimit && (
              <div className="space-y-2 ml-4">
                <Label htmlFor="quiz-time-limit">Time Limit (minutes)</Label>
                <input
                  id="quiz-time-limit"
                  type="number"
                  min="5"
                  max="180"
                  value={defaultQuizTimeLimit}
                  onChange={(e) => onDefaultQuizTimeLimitChange(Math.max(5, Math.min(180, parseInt(e.target.value) || 30)))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-sm text-muted-foreground">
                  Set quiz time limit between 5-180 minutes
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}