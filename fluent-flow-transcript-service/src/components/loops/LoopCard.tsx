import { formatDistanceToNow } from 'date-fns'
import { BookOpen, Clock, Edit, ExternalLink, Play, Trash2, Video } from 'lucide-react'
import type { LoopWithStats } from '@/lib/services/loop-management-service'

interface LoopCardProps {
  loop: LoopWithStats
  canManage: boolean
  onDelete: () => void
  onCreateSession?: () => void
  onOpenInExtension: () => void
}

export function LoopCard({
  loop,
  canManage,
  onDelete,
  onCreateSession,
  onOpenInExtension
}: LoopCardProps) {
  const duration = loop.endTime - loop.startTime

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg">
      {/* Video thumbnail placeholder */}
      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <Video className="h-8 w-8 text-indigo-600" />
      </div>

      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900">{loop.videoTitle}</h3>

        <div className="mb-3 flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {loop.segments.length} segments
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
          <span>Created {formatDistanceToNow(new Date(loop.createdAt), { addSuffix: true })}</span>
          <span>{loop.questionsCount} questions</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateSession}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-700"
          >
            <Play className="h-4 w-4" />
            Practice
          </button>

          {onOpenInExtension && (
            <button
              onClick={onOpenInExtension}
              className="flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700"
              title="Open in Extension"
            >
              <ExternalLink className="h-4 w-4" />
              Extension
            </button>
          )}

          {canManage && (
            <>
              <button
                className="p-2 text-gray-400 transition-colors hover:text-indigo-600"
                title="Edit loop"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 transition-colors hover:text-red-600"
                title="Delete loop"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
