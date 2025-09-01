'use client'

import { Users, Clock, Trophy, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface GroupSessionIndicatorProps {
  groupId: string
  sessionId: string
  sessionInfo: {
    quiz_title?: string
    video_title?: string
    video_url?: string
    scheduled_at?: string
  } | null
  onViewResults?: () => void
  onLeaveSession?: () => void
}

export function GroupSessionIndicator({ 
  groupId, 
  sessionId, 
  sessionInfo,
  onViewResults,
  onLeaveSession 
}: GroupSessionIndicatorProps) {
  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-full">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                  Group Session
                </Badge>
                <span className="text-sm font-medium text-gray-700">
                  Session ID: {sessionId.slice(0, 8)}...
                </span>
              </div>
              
              <div className="space-y-1">
                {sessionInfo?.quiz_title && (
                  <p className="text-sm font-semibold text-gray-800">
                    📝 {sessionInfo.quiz_title}
                  </p>
                )}
                
                {sessionInfo?.video_title && (
                  <p className="text-sm text-gray-600">
                    🎥 {sessionInfo.video_title}
                  </p>
                )}
                
                {sessionInfo?.scheduled_at && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      Scheduled: {new Date(sessionInfo.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-1">
                Your results will be shared with the group
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onViewResults && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onViewResults}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Trophy className="w-4 h-4 mr-1" />
                View Results
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
            
            {onLeaveSession && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onLeaveSession}
                className="text-gray-600 hover:bg-gray-100"
              >
                Leave Session
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress indicator for active sessions */}
        <div className="mt-3 pt-3 border-t border-indigo-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>🚀 Good luck! Take your time and do your best.</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Active Session
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}