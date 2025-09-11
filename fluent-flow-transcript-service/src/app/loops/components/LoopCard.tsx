'use client'

import { Play, Users, Video } from 'lucide-react'
import { LoopWithStats } from '@/lib/services/loop-management-service'

interface LoopCardProps {
  loop: LoopWithStats
  onCreateSession: (loopId: string) => void
  onPlay: (loop: LoopWithStats) => void
}

export function LoopCard({ loop, onCreateSession, onPlay }: LoopCardProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="group cursor-pointer rounded-3xl border border-white/20 bg-white/90 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-2 text-xl font-bold text-gray-800 transition-colors group-hover:text-indigo-600">
            {loop.videoTitle || 'Untitled Loop'}
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            {loop.transcript?.substring(0, 120)}...
          </p>
        </div>
        <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          Loop
        </div>
      </div>

      {/* Duration & Language */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {formatDuration((loop.endTime - loop.startTime) || 0)}
        </span>
        {loop.language && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {loop.language}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Video className="h-4 w-4" />
          <span>YouTube Video</span>
        </div>
        <div className="text-xs">{formatDate(loop.createdAt)}</div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button
          data-tour="practice-button"
          onClick={(e) => {
            e.stopPropagation()
            onPlay(loop)
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:from-indigo-700 hover:to-purple-700"
        >
          <Play className="h-4 w-4" />
          Practice
        </button>
        <button
          data-tour="group-session-button"
          onClick={(e) => {
            e.stopPropagation()
            onCreateSession(loop.id)
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50"
        >
          <Users className="h-4 w-4" />
          Study Together
        </button>
      </div>
    </div>
  )
}