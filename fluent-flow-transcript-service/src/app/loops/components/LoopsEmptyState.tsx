'use client'

import { Plus, Play } from 'lucide-react'

interface LoopsEmptyStateProps {
  handleCreateLoop: () => void
}

export function LoopsEmptyState({ handleCreateLoop }: LoopsEmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="mb-6">
        <Play className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h3 className="mb-2 text-2xl font-semibold text-gray-600">
          No loops yet
        </h3>
        <p className="mx-auto max-w-md text-gray-500">
          Create your first practice loop from a YouTube video to start practicing your language skills
        </p>
      </div>
      <div className="flex justify-center">
        <button
          onClick={handleCreateLoop}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          Create Your First Loop
        </button>
      </div>
    </div>
  )
}