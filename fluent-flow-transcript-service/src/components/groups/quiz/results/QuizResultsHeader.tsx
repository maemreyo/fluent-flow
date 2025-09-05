'use client'

interface QuizResultsHeaderProps {
  activeTab: 'personal' | 'leaderboard'
  onTabChange: (tab: 'personal' | 'leaderboard') => void
}

export function QuizResultsHeader({ activeTab, onTabChange }: QuizResultsHeaderProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="space-y-2">
        <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-3xl font-bold text-transparent">
          Quiz Complete! 🎉
        </h1>
        <p className="text-gray-600">Great job completing the group quiz session</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => onTabChange('personal')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'personal'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Your Results
          </button>
          <button
            onClick={() => onTabChange('leaderboard')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Group Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}