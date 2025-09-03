'use client'

import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Video, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { GroupSession, Group } from '../queries'

interface GroupQuizHeaderProps {
  session?: GroupSession
  group?: Group  
  participantsCount: number
  onlineCount: number
}

export function GroupQuizHeader({ 
  session, 
  group, 
  participantsCount, 
  onlineCount 
}: GroupQuizHeaderProps) {
  const router = useRouter()

  const handleGoBack = () => {
    router.push(`/groups/${group?.id}`)
  }

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-white/20 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back button + Session info */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back to Group</span>
            </button>

            <div className="h-6 w-px bg-gray-300" />

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-gray-800">
                {session?.quiz_title || 'Group Quiz'}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {session?.video_title && (
                  <div className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>{session.video_title}</span>
                  </div>
                )}
                
                {session?.scheduled_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(session.scheduled_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Status + Participants */}
          <div className="flex items-center gap-4">
            {/* Participants count */}
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-indigo-600">{onlineCount}</span>
              <span className="text-gray-400">/</span>
              <span>{participantsCount}</span>
              <span className="text-gray-500">online</span>
            </div>

            {/* Session status */}
            {session?.status && (
              <Badge
                className={
                  session.status === 'active'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : session.status === 'scheduled'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : session.status === 'completed'
                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }
              >
                {session.status}
              </Badge>
            )}

            {/* Group name */}
            {group?.name && (
              <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {group.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}