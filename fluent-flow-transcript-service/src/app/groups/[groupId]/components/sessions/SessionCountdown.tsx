'use client'

import { useEffect, useState } from 'react'
import { Clock, Rocket, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface SessionCountdownProps {
  seconds: number
  onComplete: () => void
  onCancel?: () => void
}

export function SessionCountdown({ seconds, onComplete, onCancel }: SessionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(seconds)

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete()
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, onComplete])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getUrgencyLevel = (seconds: number) => {
    if (seconds > 300)
      return {
        gradient: 'from-blue-500/20 to-indigo-500/20',
        textColor: 'text-indigo-600',
        bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        borderColor: 'border-indigo-200/50',
        icon: Clock
      }
    if (seconds > 60)
      return {
        gradient: 'from-orange-500/20 to-amber-500/20',
        textColor: 'text-orange-600',
        bgColor: 'bg-gradient-to-br from-orange-50 to-amber-50',
        borderColor: 'border-orange-200/50',
        icon: Zap
      }
    return {
      gradient: 'from-red-500/20 to-pink-500/20',
      textColor: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-50 to-pink-50',
      borderColor: 'border-red-200/50',
      icon: Rocket
    }
  }

  const urgency = getUrgencyLevel(timeLeft)
  const initialSeconds = seconds
  const progressPercentage = ((initialSeconds - timeLeft) / initialSeconds) * 100

  return (
    <div className={`rounded-lg border p-6 text-center ${urgency.bgColor} ${urgency.borderColor} shadow-md`}>
      {/* Header with icon and title */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <urgency.icon className={`h-6 w-6 ${urgency.textColor}`} />
        <h3 className={`text-lg font-semibold ${urgency.textColor}`}>
          {timeLeft <= 60 ? 'Starting Soon!' : 'Quiz Starting'}
        </h3>
      </div>

      {/* Main countdown */}
      <div className={`mb-4 text-4xl font-bold ${urgency.textColor} font-mono ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
        {formatTime(timeLeft)}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress value={progressPercentage} className="h-2 bg-white/30" />
      </div>

      {/* Status message */}
      <p className={`text-sm ${urgency.textColor} opacity-80 mb-4`}>
        {timeLeft <= 10 ? 'Get ready! Starting now...' :
         timeLeft <= 60 ? 'Starting very soon...' :
         'Quiz will start automatically'}
      </p>

      {/* Action buttons */}
      {onCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className={`${urgency.textColor} border-current hover:bg-current hover:text-white transition-colors`}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      )}
    </div>
  )
}
