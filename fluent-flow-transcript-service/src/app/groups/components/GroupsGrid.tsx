'use client'

import { GroupCard } from './GroupCard'
import { StudyGroup } from '../types'

interface GroupsGridProps {
  groups: StudyGroup[]
}

export function GroupsGrid({ groups }: GroupsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {groups.map(group => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}
