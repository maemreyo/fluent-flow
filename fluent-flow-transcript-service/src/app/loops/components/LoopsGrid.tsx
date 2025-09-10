'use client'

import { LoopWithStats } from '@/lib/services/loop-management-service'
import { LoopCard } from './LoopCard'

interface LoopsGridProps {
  loops: LoopWithStats[]
  onCreateSession: (loopId: string) => void
  onPlayLoop: (loop: LoopWithStats) => void
}

export function LoopsGrid({ loops, onCreateSession, onPlayLoop }: LoopsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {loops.map(loop => (
        <LoopCard 
          key={loop.id} 
          loop={loop} 
          onCreateSession={onCreateSession}
          onPlay={onPlayLoop}
        />
      ))}
    </div>
  )
}