import React from 'react'
import { CurrentVideoCard } from './current-video-card'
import { StatisticsCards } from './statistics-cards'
import { RecentSessionsCard } from './recent-sessions-card'
import { QuickActionsCard } from './quick-actions-card'
import { AnalyticsCard } from './analytics-card'
import { TranscriptIntegration } from './transcript-integration'
import { GoalsCard } from './goals-card'
import { SessionTemplatesCard } from './session-templates-card'
import type { 
  YouTubeVideoInfo, 
  PracticeStatistics, 
  PracticeSession 
} from '../../lib/types/fluent-flow-types'
import type { LearningGoal, GoalProgress, GoalSuggestion } from '../../lib/utils/goals-analysis'
import type { SessionTemplate, SessionPlan } from '../../lib/utils/session-templates'

interface SavedLoop {
  id: string
  startTime: number
  endTime: number
  title: string
  videoId: string
}

interface AnalyticsData {
  weeklyTrend: Array<{
    date: Date
    sessions: number
    practiceTime: number
    recordings: number
  }>
  monthlyTrend: Array<{
    weekStart: Date
    sessions: number
    practiceTime: number
    recordings: number
  }>
  dailyAverages: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
  }
  practiceStreak: number
  mostActiveDay: number | null
  improvementRate: number
}

interface DashboardProps {
  currentVideo: YouTubeVideoInfo | null
  statistics: PracticeStatistics
  allSessions: PracticeSession[]
  currentSession: PracticeSession | null
  savedLoops: SavedLoop[]
  analytics: AnalyticsData
  goals: LearningGoal[]
  goalsProgress: { [goalId: string]: GoalProgress }
  goalSuggestions: GoalSuggestion[]
  templates: SessionTemplate[]
  activePlans: (SessionPlan & { id: string })[]
  completedPlans: (SessionPlan & { id: string })[]
  formatTime: (seconds: number) => string
  formatDate: (date: Date) => string
  onViewLoops: () => void
  onCreateGoal?: (suggestion: GoalSuggestion) => void
  onDeleteGoal?: (goalId: string) => void
  onStartSession?: (templateId: string) => void
  onContinueSession?: (planId: string) => void
  onCreateTemplate?: () => void
  onViewPlan?: (planId: string) => void
}

export function Dashboard({
  currentVideo,
  statistics,
  allSessions,
  currentSession,
  savedLoops,
  analytics,
  goals,
  goalsProgress,
  goalSuggestions,
  templates,
  activePlans,
  completedPlans,
  formatTime,
  formatDate,
  onViewLoops,
  onCreateGoal,
  onDeleteGoal,
  onStartSession,
  onContinueSession,
  onCreateTemplate,
  onViewPlan
}: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Current Video */}
      <CurrentVideoCard currentVideo={currentVideo} />

      {/* Statistics Cards */}
      <StatisticsCards statistics={statistics} formatTime={formatTime} />

      {/* Analytics & Trends */}
      <AnalyticsCard analytics={analytics} formatTime={formatTime} />

      {/* Learning Goals */}
      <GoalsCard 
        goals={goals}
        goalsProgress={goalsProgress}
        suggestions={goalSuggestions}
        formatTime={formatTime}
        onCreateGoal={onCreateGoal}
        onDeleteGoal={onDeleteGoal}
      />

      {/* Session Templates */}
      <SessionTemplatesCard
        templates={templates}
        activePlans={activePlans}
        completedPlans={completedPlans}
        formatTime={formatTime}
        onStartSession={onStartSession}
        onContinueSession={onContinueSession}
        onCreateTemplate={onCreateTemplate}
        onViewPlan={onViewPlan}
      />

      {/* Transcript Viewer */}
      <TranscriptIntegration
        currentVideo={currentVideo}
        savedLoops={savedLoops}
        formatTime={formatTime}
      />

      {/* Recent Sessions */}
      <RecentSessionsCard
        allSessions={allSessions}
        currentSession={currentSession}
        formatDate={formatDate}
        formatTime={formatTime}
      />

      {/* Quick Actions */}
      <QuickActionsCard
        onViewLoops={onViewLoops}
      />
    </div>
  )
}