'use client'

import { Calendar, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface QuizRoomHeaderProps {
  session: {
    id: string
    quiz_title: string
    video_title?: string
    video_url?: string
    scheduled_at?: string
    status: 'scheduled' | 'active' | 'completed' | 'cancelled'
    quiz_token: string
    created_by: string
    questions_data?: any
  }
}

export function QuizRoomHeader({ session }: QuizRoomHeaderProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">{session.quiz_title}</h2>
          {session.video_title && (
            <div className="flex items-center gap-2 text-gray-600">
              <Video className="h-4 w-4" />
              <span>{session.video_title}</span>
            </div>
          )}
        </div>
        
        <Badge
          className={
            session.status === 'active'
              ? 'border-green-200 bg-green-100 text-green-800'
              : session.status === 'scheduled'
                ? 'border-blue-200 bg-blue-100 text-blue-800'
                : 'border-gray-200 bg-gray-100 text-gray-600'
          }
        >
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </Badge>
      </div>

      {session.scheduled_at && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Scheduled: {new Date(session.scheduled_at).toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}