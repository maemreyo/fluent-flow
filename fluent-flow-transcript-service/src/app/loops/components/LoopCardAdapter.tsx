'use client'

import { LoopCard } from './LoopCard'
import type { LoopWithStats } from '@/lib/services/loop-management-service'

interface LoopCardAdapterProps {
  item: LoopWithStats
  onCreateSession?: (loopId: string) => void
  onPlayLoop?: (loop: LoopWithStats) => void
}

export function LoopCardAdapter({ item, onCreateSession, onPlayLoop }: LoopCardAdapterProps) {
  return (
    <LoopCard 
      loop={item} 
      onCreateSession={onCreateSession || (() => {})}
      onPlay={onPlayLoop || (() => {})}
    />
  )
}