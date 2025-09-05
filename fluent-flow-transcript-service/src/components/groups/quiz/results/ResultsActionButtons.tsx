'use client'

import { ArrowLeft, Home, RotateCcw, Share2 } from 'lucide-react'
import { Button } from '../../../ui/button'

interface ResultsActionButtonsProps {
  groupId: string
  onRestart: () => void
  userScore?: number
}

export function ResultsActionButtons({ groupId, onRestart, userScore }: ResultsActionButtonsProps) {
  const handleShare = () => {
    // Share results functionality
    if (navigator.share) {
      navigator.share({
        title: 'Group Quiz Results',
        text: `I scored ${userScore || 0}% in our group quiz!`,
        url: window.location.href
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(
        `I scored ${userScore || 0}% in our group quiz! ${window.location.href}`
      )
    }
  }

  return (
    <div className="flex flex-col justify-center gap-3 sm:flex-row">
      {/* Primary Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => (window.location.href = `/groups/${groupId}`)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Group
        </Button>

        <Button onClick={onRestart} className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => (window.location.href = '/groups')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          All Groups
        </Button>

        <Button
          onClick={handleShare}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  )
}