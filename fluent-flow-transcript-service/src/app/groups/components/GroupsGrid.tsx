'use client'

import { useQueryClient } from '@tanstack/react-query'
import { GroupCard } from './GroupCard'
import { StudyGroup } from '../types'
import { fetchGroup } from '../[groupId]/queries'

interface GroupsGridProps {
  groups: StudyGroup[]
}

export function GroupsGrid({ groups }: GroupsGridProps) {
  const queryClient = useQueryClient()

  const handlePrefetchGroup = (groupId: string, groupData: StudyGroup) => {
    // Chỉ prefetch nếu chưa có data trong cache hoặc data đã stale
    const existingData = queryClient.getQueryData(['group', groupId])
    const queryState = queryClient.getQueryState(['group', groupId])
    
    // Nếu đã có fresh data, không cần prefetch
    if (existingData && queryState && queryState.dataUpdatedAt && Date.now() - queryState.dataUpdatedAt < 60000) {
      return
    }
    
    // Prefetch full detail mà không seed cache trước
    queryClient.prefetchQuery({
      queryKey: ['group', groupId],
      queryFn: () => fetchGroup(groupId),
      staleTime: 1 * 60 * 1000, // 1 phút để đảm bảo fresh data
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {groups.map(group => (
        <GroupCard 
          key={group.id} 
          group={group} 
          onPrefetch={handlePrefetchGroup}
        />
      ))}
    </div>
  )
}
