'use client'

import { Plus, Search, UserPlus } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface GroupsHeaderProps {
  user: User | null
  isAuthenticated: boolean
  signOut: () => void
  handleJoinGroup: () => void
  handleCreateGroup: () => void
  activeTab: 'my-groups' | 'public'
  setActiveTab: (tab: 'my-groups' | 'public') => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  onPrefetchTab?: (tab: 'my-groups' | 'public') => void
}

export function GroupsHeader({
  user,
  isAuthenticated,
  signOut,
  handleJoinGroup,
  handleCreateGroup,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onPrefetchTab
}: GroupsHeaderProps) {
  return (
    <div className="mb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
            Study Groups
          </h1>
          <p className="text-lg text-gray-600">
            Join or create groups to learn together and track progress
          </p>
          {user && (
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>Welcome, {user.email}</span>
              <button
                onClick={signOut}
                className="font-medium text-indigo-600 transition-colors hover:text-indigo-700"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="flex gap-3">
            <button
              onClick={handleJoinGroup}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-indigo-200 bg-white/80 px-6 py-3 font-semibold text-indigo-700 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-indigo-300 hover:bg-indigo-50"
            >
              <UserPlus className="h-5 w-5" />
              Join Group
            </button>
            <button
              onClick={handleCreateGroup}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="h-5 w-5" />
              Create Group
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <>
          {/* Tab Navigation */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex rounded-2xl border border-white/20 bg-white/80 p-1 shadow-lg backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('my-groups')}
                onMouseEnter={() => onPrefetchTab?.('my-groups')}
                className={`rounded-xl px-6 py-2 font-semibold transition-all duration-300 ${
                  activeTab === 'my-groups'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                My Groups
              </button>
              <button
                onClick={() => setActiveTab('public')}
                onMouseEnter={() => onPrefetchTab?.('public')}
                className={`rounded-xl px-6 py-2 font-semibold transition-all duration-300 ${
                  activeTab === 'public'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                Discover
              </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white/80 py-3 pl-10 pr-4 shadow-lg backdrop-blur-sm transition-all duration-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
