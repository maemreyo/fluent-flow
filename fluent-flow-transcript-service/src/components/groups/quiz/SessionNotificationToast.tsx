'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'

interface SessionNotificationToastProps {
  sessionId: string
  groupId: string
  sessionTitle: string
  startedBy: string
  participantsCount?: number
}

export function SessionNotificationToast({
  sessionId,
  groupId,
  sessionTitle,
  startedBy,
  participantsCount = 0
}: SessionNotificationToastProps) {
  const router = useRouter()

  const handleJoinQuiz = () => {
    toast.dismiss() // Close the toast
    router.push(`/groups/${groupId}/quiz/${sessionId}`)
  }

  const handleDismiss = () => {
    toast.dismiss()
  }

  useEffect(() => {
    // Show enhanced notification toast
    toast(
      <div className="flex items-center gap-4 p-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Play className="h-6 w-6 text-green-600" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">Quiz Session Started!</h4>
            <Badge variant="secondary" className="text-xs">Live</Badge>
          </div>
          <p className="text-sm text-gray-600">{sessionTitle}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>Started by {startedBy}</span>
            {participantsCount > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{participantsCount} participants</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={handleJoinQuiz} className="text-xs">
            <Play className="mr-1 h-3 w-3" />
            Join Quiz
          </Button>
          <Button size="sm" variant="outline" onClick={handleDismiss} className="text-xs">
            Dismiss
          </Button>
        </div>
      </div>,
      {
        duration: 15000, // 15 seconds
        position: 'top-right',
        dismissible: true,
        className: 'w-96 border-green-200 bg-green-50'
      }
    )
  }, [sessionId, groupId, sessionTitle, startedBy, participantsCount])

  return null // This component only triggers the toast
}