import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { YouTubeVideoInfo } from '../../lib/types/fluent-flow-types'

interface CurrentVideoCardProps {
  currentVideo: YouTubeVideoInfo | null
}

export function CurrentVideoCard({ currentVideo }: CurrentVideoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {currentVideo ? (
            <>
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
              <CardTitle className="text-sm">Currently Practicing</CardTitle>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-gray-400"></div>
              <CardTitle className="text-sm">No Video Detected</CardTitle>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {currentVideo ? (
            <>
              <p className="text-sm font-medium">{currentVideo.title}</p>
              <p className="text-xs text-muted-foreground">{currentVideo.channel}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Open a YouTube video and FluentFlow will detect it automatically
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}