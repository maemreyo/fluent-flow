import React from 'react'
import { getTimeBasedGreeting } from '../../lib/utils/newtab-analytics'
import { DailyStatsCard } from './daily-stats-card'
import { QuickActionsGrid } from './quick-actions-grid'
import { WeeklyProgressChart } from './weekly-progress-chart'
import { AchievementsCard } from './achievements-card'
import { SavedContentCard } from './saved-content-card'
import { MotivationalCard } from './motivational-card'
import type { NewTabData } from '../../lib/utils/newtab-analytics'

interface NewTabContentProps {
  data: NewTabData
  onQuickAction: (actionId: string, data?: any) => void
  onBookmark: (videoId: string, title: string, thumbnail: string) => void
  onRemoveBookmark: (videoId: string) => void
  onSaveNote: (content: string, videoId?: string) => void
  onDeleteNote: (noteId: string) => void
  onRefresh: () => void
}

export function NewTabContent({
  data,
  onQuickAction,
  onBookmark,
  onRemoveBookmark,
  onSaveNote,
  onDeleteNote,
  onRefresh
}: NewTabContentProps) {
  const greeting = getTimeBasedGreeting()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="container mx-auto px-6 pt-8 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              FluentFlow
            </h1>
            <p className="text-gray-600 text-lg">
              {greeting}
            </p>
          </div>
          
          {/* Practice Streak */}
          {data.practiceStreak > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border">
              <div className="text-2xl">🔥</div>
              <div>
                <p className="text-sm text-gray-500">Practice Streak</p>
                <p className="text-xl font-bold text-orange-600">{data.practiceStreak} days</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Daily Stats */}
            <DailyStatsCard stats={data.todayStats} />
            
            {/* Quick Actions */}
            <QuickActionsGrid 
              actions={data.quickActions}
              onAction={onQuickAction}
            />
            
            {/* Weekly Progress */}
            <WeeklyProgressChart 
              weeklyProgress={data.weeklyProgress}
            />
            
            {/* Saved Content */}
            <SavedContentCard
              content={data.savedContent}
              onBookmark={onBookmark}
              onRemoveBookmark={onRemoveBookmark}
              onSaveNote={onSaveNote}
              onDeleteNote={onDeleteNote}
            />
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Motivational Quote */}
            <MotivationalCard 
              motivationalData={data.motivationalData}
            />
            
            {/* Recent Achievements */}
            <AchievementsCard 
              achievements={data.recentAchievements}
            />
            
            {/* Refresh Button */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <button
                onClick={onRefresh}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Keep practicing every day to maintain your streak! 🌟
          </p>
        </div>
      </div>
    </div>
  )
}