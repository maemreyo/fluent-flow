'use client'

import { Calendar, Play, Settings, Users } from 'lucide-react'

export type GroupTab = 'overview' | 'members' | 'sessions' | 'settings'

interface TabNavigationProps {
  activeTab: GroupTab
  setActiveTab: (tab: GroupTab) => void
  canManage: boolean
}

export function TabNavigation({
  activeTab,
  setActiveTab,
  canManage
}: TabNavigationProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Play },
    ...(canManage ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
  ]

  return (
    <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-lg border border-white/20 mb-8">
      {tabs.map(tab => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as GroupTab)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            <Icon className="w-5 h-5" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
