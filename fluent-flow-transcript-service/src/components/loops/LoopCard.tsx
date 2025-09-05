import { Clock, Video, BookOpen, Play, Edit, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { LoopWithStats } from '@/lib/services/loop-management-service'

interface LoopCardProps {
  loop: LoopWithStats
  canManage: boolean
  onDelete: () => void
  onCreateSession?: () => void
}

export function LoopCard({ 
  loop, 
  canManage, 
  onDelete, 
  onCreateSession 
}: LoopCardProps) {
  const duration = loop.endTime - loop.startTime

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200">
      {/* Video thumbnail placeholder */}
      <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
        <Video className="w-8 h-8 text-indigo-600" />
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {loop.videoTitle}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {loop.segments.length} segments
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>Created {formatDistanceToNow(new Date(loop.createdAt), { addSuffix: true })}</span>
          <span>{loop.questionsCount} questions</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateSession}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            Practice
          </button>
          
          {canManage && (
            <>
              <button
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Edit loop"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete loop"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}