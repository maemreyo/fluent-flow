'use client'

import { useEffect, useState } from 'react'

interface SessionCountdownProps {
  seconds: number
  onComplete: () => void
}

export function SessionCountdown({ seconds: initialSeconds, onComplete }: SessionCountdownProps) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    if (seconds <= 0) {
      onComplete()
      return
    }

    const timer = setTimeout(() => {
      setSeconds(seconds - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [seconds, onComplete])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center">
      <div className="mb-4">
        <div className="text-3xl font-bold text-indigo-800 mb-2">
          {formatTime(seconds)}
        </div>
        <p className="text-indigo-600">
          Quiz starts in
        </p>
      </div>
      
      <div className="w-full bg-indigo-200 rounded-full h-2">
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
          style={{ width: `${100 - (seconds / initialSeconds) * 100}%` }}
        />
      </div>
    </div>
  )
}