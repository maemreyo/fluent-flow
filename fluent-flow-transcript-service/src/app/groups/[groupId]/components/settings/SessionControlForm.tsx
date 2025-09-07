'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SessionControlFormProps {
  onlyAdminsCanCreateSessions: boolean
  onlyAdminsCanStartQuiz: boolean
  maxConcurrentSessions: number
  requireSessionApproval: boolean
  allowQuizRetakes: boolean
  onOnlyAdminsCanCreateSessionsChange: (value: boolean) => void
  onOnlyAdminsCanStartQuizChange: (value: boolean) => void
  onMaxConcurrentSessionsChange: (value: number) => void
  onRequireSessionApprovalChange: (value: boolean) => void
  onAllowQuizRetakesChange: (value: boolean) => void
}

export function SessionControlForm({
  onlyAdminsCanCreateSessions,
  onlyAdminsCanStartQuiz,
  maxConcurrentSessions,
  requireSessionApproval,
  allowQuizRetakes,
  onOnlyAdminsCanCreateSessionsChange,
  onOnlyAdminsCanStartQuizChange,
  onMaxConcurrentSessionsChange,
  onRequireSessionApprovalChange,
  onAllowQuizRetakesChange
}: SessionControlFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Control</CardTitle>
        <CardDescription>
          Manage quiz session creation and participation settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Creation Restrictions */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Only Admins Can Create Sessions</Label>
            <CardDescription>
              Restrict session creation to owners and administrators only
            </CardDescription>
          </div>
          <Switch
            checked={onlyAdminsCanCreateSessions}
            onCheckedChange={onOnlyAdminsCanCreateSessionsChange}
          />
        </div>

        {/* Quiz Start Restrictions */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Only Admins Can Start Quiz</Label>
            <CardDescription>
              Restrict quiz starting to owners, administrators, and session creators only
            </CardDescription>
          </div>
          <Switch
            checked={onlyAdminsCanStartQuiz}
            onCheckedChange={onOnlyAdminsCanStartQuizChange}
          />
        </div>

        {/* Session Approval */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Require Session Approval</Label>
            <CardDescription>
              New quiz sessions need owner/admin approval before starting
            </CardDescription>
          </div>
          <Switch
            checked={requireSessionApproval}
            onCheckedChange={onRequireSessionApprovalChange}
          />
        </div>

        {/* Max Concurrent Sessions */}
        <div className="space-y-2">
          <Label htmlFor="max-concurrent-sessions">Maximum Concurrent Sessions</Label>
          <CardDescription>
            Limit how many quiz sessions can run at the same time (1-20)
          </CardDescription>
          <Input
            id="max-concurrent-sessions"
            type="number"
            min="1"
            max="20"
            value={maxConcurrentSessions}
            onChange={(e) => onMaxConcurrentSessionsChange(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          />
        </div>

        {/* Quiz Behavior */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium text-sm text-muted-foreground">Quiz Behavior</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Allow Quiz Retakes</Label>
              <CardDescription>
                Members can retake completed quizzes to improve their scores
              </CardDescription>
            </div>
            <Switch
              checked={allowQuizRetakes}
              onCheckedChange={onAllowQuizRetakesChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}