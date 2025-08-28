import { Dashboard } from '../dashboard'
import type { SavedLoop } from '../../lib/types/fluent-flow-types'
import type { LearningGoal, GoalProgress, GoalSuggestion } from '../../lib/utils/goals-analysis'
import type { SessionTemplate, SessionPlan } from '../../lib/utils/session-templates'

interface DashboardTabProps {
  currentVideo: any
  statistics: any
  allSessions: any[]
  currentSession: any
  savedLoops: SavedLoop[]
  analytics: any
  goals: LearningGoal[]
  goalsProgress: { [goalId: string]: GoalProgress }
  goalSuggestions: GoalSuggestion[]
  templates: SessionTemplate[]
  activePlans: (SessionPlan & { id: string })[]
  completedPlans: (SessionPlan & { id: string })[]
  formatTime: (seconds: number) => string
  formatDate: (date: Date) => string
  onViewLoops: () => void
  onCreateGoal: (suggestion: GoalSuggestion) => Promise<void>
  onDeleteGoal: (goalId: string) => Promise<void>
  onStartSession: (templateId: string) => Promise<void>
  onContinueSession: (planId: string) => Promise<void>
  onCreateTemplate: () => void
  onViewPlan: (planId: string) => void
}

export function DashboardTab(props: DashboardTabProps) {
  return (
    <Dashboard
      currentVideo={props.currentVideo}
      statistics={props.statistics}
      allSessions={props.allSessions}
      currentSession={props.currentSession}
      savedLoops={props.savedLoops}
      analytics={props.analytics}
      goals={props.goals}
      goalsProgress={props.goalsProgress}
      goalSuggestions={props.goalSuggestions}
      templates={props.templates}
      activePlans={props.activePlans}
      completedPlans={props.completedPlans}
      formatTime={props.formatTime}
      formatDate={props.formatDate}
      onViewLoops={props.onViewLoops}
      onCreateGoal={props.onCreateGoal}
      onDeleteGoal={props.onDeleteGoal}
      onStartSession={props.onStartSession}
      onContinueSession={props.onContinueSession}
      onCreateTemplate={props.onCreateTemplate}
      onViewPlan={props.onViewPlan}
    />
  )
}