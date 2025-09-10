'use client'

import { Plus, Search } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface LoopsHeaderProps {
  user: User | null
  isAuthenticated: boolean
  signOut: () => void
  handleCreateLoop: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export function LoopsHeader({
  user,
  isAuthenticated,
  signOut,
  handleCreateLoop,
  searchQuery,
  setSearchQuery
}: LoopsHeaderProps) {
  return (
    <div className="mb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
            My Loops
          </h1>
          <p className="text-lg text-gray-600">
            Create and manage your personal practice loops from YouTube videos
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
              onClick={handleCreateLoop}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="h-5 w-5" />
              Create Loop
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className="mb-6 flex items-center gap-4">
          {/* Search */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search loops..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 bg-white/80 py-3 pl-10 pr-4 shadow-lg backdrop-blur-sm transition-all duration-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  )
}