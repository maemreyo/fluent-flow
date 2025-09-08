'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Clock, Zap, Rocket, X } from 'lucide-react'

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
    if (seconds > 300) return { 
      gradient: 'from-blue-500/20 to-indigo-500/20', 
      textColor: 'text-indigo-600', 
      bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      borderColor: 'border-indigo-200/50',
      icon: Clock
    }
    if (seconds > 60) return { 
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
    <div className={`${urgency.bgColor} backdrop-blur-sm rounded-2xl p-8 shadow-lg border ${urgency.borderColor} border-white/20 relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className={`absolute inset-0 bg-gradient-to-r ${urgency.gradient} animate-pulse`} />
      
      <div className="relative z-10">
        <div className="text-center space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <urgency.icon className={`w-8 h-8 ${urgency.textColor} ${timeLeft <= 10 ? 'animate-bounce' : ''}`} />
              <h3 className={`text-2xl font-bold ${urgency.textColor}`}>
                {timeLeft <= 60 ? 'Starting Soon!' : 'Quiz Countdown'}
              </h3>
            </div>
            
            {/* Main countdown display */}
            <div className={`text-6xl md:text-7xl font-bold ${urgency.textColor} font-mono tracking-tight ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress visualization */}
          <div className="space-y-3 max-w-md mx-auto">
            <Progress 
              value={progressPercentage} 
              className="h-3 bg-white/30"
            />
            <p className={`text-sm font-medium ${urgency.textColor} opacity-80`}>
              {timeLeft <= 60 ? 'Get ready! Starting very soon...' : 
               timeLeft <= 300 ? 'Quiz starting in a few minutes' :
               'Plenty of time to prepare'}
            </p>
          </div>

          {/* Final countdown special effects */}
          {timeLeft <= 10 && (
            <div className={`animate-bounce text-xl font-bold ${urgency.textColor} flex items-center justify-center gap-2`}>
              <Rocket className="w-6 h-6" />
              <span>Ready for takeoff! 🚀</span>
            </div>
          )}

          {/* Status indicators */}
          <div className="flex justify-center space-x-8 text-sm font-medium">
            <div className={`${urgency.textColor} opacity-75`}>
              {timeLeft > 3600 ? 'Long wait ahead' :
               timeLeft > 1800 ? 'Half hour to go' :
               timeLeft > 300 ? 'Final preparations' :
               timeLeft > 60 ? 'Almost there!' :
               'Any second now!'}
            </div>
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className={`bg-white/80 border-2 ${urgency.borderColor} ${urgency.textColor} hover:bg-white/90 hover:scale-105 transition-all duration-200 flex items-center gap-2`}
              >
                <X className="w-4 h-4" />
                Cancel Countdown
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}