import React from 'react'
import { Calendar } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { PracticeSession } from '../../lib/types/fluent-flow-types'

interface RecentSessionsCardProps {
  allSessions: PracticeSession[]
  currentSession: PracticeSession | null
  formatDate: (date: Date) => string
  formatTime: (seconds: number) => string
}

export function RecentSessionsCard({ 
  allSessions, 
  currentSession, 
  formatDate, 
  formatTime 
}: RecentSessionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Recent Practice Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allSessions.slice(0, 5).map(session => (
          <div
            key={session.id}
            className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
              currentSession?.id === session.id ? 'border-blue-200 bg-blue-50' : ''
            }`}
            onClick={() => {}}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.videoTitle}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(session.createdAt)}</span>
                <span>•</span>
                <span>{session.segments.length} segments</span>
                <span>•</span>
                <span>{session.recordings.length} recordings</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {formatTime(session.totalPracticeTime)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}