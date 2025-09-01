'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LearningSettingsFormProps {
  language: string
  level: string
  onLanguageChange: (value: string) => void
  onLevelChange: (value: string) => void
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
  onLanguageChange,
  onLevelChange
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
      </CardContent>
    </Card>
  )
}