'use client'

import { Calendar, Play, Settings, Users, BookOpen } from 'lucide-react'

export type GroupTab = 'overview' | 'members' | 'sessions' | 'loops' | 'settings'

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
    { id: 'loops', label: 'Loops', icon: BookOpen },
    ...(canManage ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
  ]

  return (
    <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-lg border border-white/20 mb-8">
      {tabs.map(tab => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => {
              console.log(`Switching to tab: ${tab.id}`) // Debug log
              setActiveTab(tab.id as GroupTab)
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-indigo-600 hover:bg-white/60'
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
