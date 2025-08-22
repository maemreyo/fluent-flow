import React from 'react'
import { CurrentVideoCard } from './current-video-card'
import { StatisticsCards } from './statistics-cards'
import { RecentSessionsCard } from './recent-sessions-card'
import { QuickActionsCard } from './quick-actions-card'
import type { 
  YouTubeVideoInfo, 
  PracticeStatistics, 
  PracticeSession 
} from '../../lib/types/fluent-flow-types'

interface DashboardProps {
  currentVideo: YouTubeVideoInfo | null
  statistics: PracticeStatistics
  allSessions: PracticeSession[]
  currentSession: PracticeSession | null
  formatTime: (seconds: number) => string
  formatDate: (date: Date) => string
  onViewLoops: () => void
}

export function Dashboard({
  currentVideo,
  statistics,
  allSessions,
  currentSession,
  formatTime,
  formatDate,
  onViewLoops
}: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Current Video */}
      <CurrentVideoCard currentVideo={currentVideo} />

      {/* Statistics Cards */}
      <StatisticsCards statistics={statistics} formatTime={formatTime} />

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