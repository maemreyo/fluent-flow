'use client'

import { Group } from '../types'
import { GroupCard } from './GroupCard'

interface GroupCardAdapterProps {
  item: Group
  onPrefetch?: (groupId: string, group: Group) => void
}

export function GroupCardAdapter({ item, onPrefetch }: GroupCardAdapterProps) {
  return (
    <GroupCard 
      group={item} 
      onPrefetch={onPrefetch}
    />
  )
}