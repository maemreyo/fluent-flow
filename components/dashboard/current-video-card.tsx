import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { YouTubeVideoInfo } from '../../lib/types/fluent-flow-types'

interface CurrentVideoCardProps {
  currentVideo: YouTubeVideoInfo | null
}

export function CurrentVideoCard({ currentVideo }: CurrentVideoCardProps) {
  if (!currentVideo) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
          <CardTitle className="text-sm">Currently Practicing</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-sm font-medium">{currentVideo.title}</p>
          <p className="text-xs text-muted-foreground">{currentVideo.channel}</p>
        </div>
      </CardContent>
    </Card>
  )
}