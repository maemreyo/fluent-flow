'use client'

import { Plus, UserPlus, Users } from 'lucide-react'

interface EmptyStateProps {
  activeTab: 'my-groups' | 'public'
  handleCreateGroup: () => void
  handleJoinGroup: () => void
}

export function EmptyState({
  activeTab,
  handleCreateGroup,
  handleJoinGroup
}: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="mb-6">
        <Users className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h3 className="mb-2 text-2xl font-semibold text-gray-600">
          {activeTab === 'my-groups' ? 'No groups yet' : 'No public groups found'}
        </h3>
        <p className="mx-auto max-w-md text-gray-500">
          {activeTab === 'my-groups'
            ? 'Create your first study group or join an existing one to get started'
            : 'Try adjusting your search or create a public group for others to discover'}
        </p>
      </div>
      <div className="flex justify-center gap-4">
        <button
          onClick={handleCreateGroup}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          Create Group
        </button>
        <button
          onClick={handleJoinGroup}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-indigo-200 bg-white/80 px-6 py-3 font-semibold text-indigo-700 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-indigo-300 hover:bg-indigo-50"
        >
          <UserPlus className="h-5 w-5" />
          Join Group
        </button>
      </div>
    </div>
  )
}
