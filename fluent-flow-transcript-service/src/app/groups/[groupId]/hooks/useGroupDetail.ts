import { useQuery, useQueryClient } from '@tanstack/react-query'
import { StudyGroup as GroupListItem } from '../../types'
import { fetchGroup } from '../queries'
import { StudyGroup as GroupDetail } from '../types'

interface UseGroupDetailProps {
  groupId: string
  isAuthenticated: boolean
  initialData?: GroupListItem // Data từ groups list
}

export const useGroupDetail = ({ groupId, isAuthenticated, initialData }: UseGroupDetailProps) => {
  const queryClient = useQueryClient()

  // Transform basic group data thành format cho detail page
  const transformInitialData = (basicGroup: GroupListItem): Partial<GroupDetail> => {
    return {
      id: basicGroup.id,
      name: basicGroup.name,
      description: basicGroup.description,
      language: basicGroup.language,
      level: basicGroup.level,
      created_by: basicGroup.created_by,
      created_at: basicGroup.created_at,
      is_private: basicGroup.is_private,
      max_members: basicGroup.max_members,
      member_count: basicGroup.member_count,
      // Map basic members info
      members:
        basicGroup.study_group_members?.map(member => ({
          user_id: member.user_id,
          username: member.username,
          role: member.role,
          joined_at: member.joined_at,
          contribution: 0, // Default values cho missing fields
          last_active: member.joined_at
        })) || [],
      // Default values cho missing detail fields
      group_code: '',
      user_role: basicGroup.study_group_members?.[0]?.role || null,
      is_member: !!basicGroup.study_group_members?.length,
      recent_sessions: []
    }
  }

  // Seed cache với initial data nếu có
  if (initialData && !queryClient.getQueryData(['group', groupId])) {
    queryClient.setQueryData(['group', groupId], transformInitialData(initialData))
  }

  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroup(groupId),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // Giảm xuống 1 phút để đảm bảo fresh data
    gcTime: 10 * 60 * 1000, // 10 phút
    refetchOnWindowFocus: false,
    // Force refetch nếu data quá cũ
    refetchOnMount: 'always'
  } as any)

  // Prefetch function
  const prefetchGroup = (groupId: string, basicData?: GroupListItem) => {
    // Seed cache trước khi prefetch
    if (basicData) {
      queryClient.setQueryData(['group', groupId], transformInitialData(basicData))
    }

    return queryClient.prefetchQuery({
      queryKey: ['group', groupId],
      queryFn: () => fetchGroup(groupId),
      staleTime: 3 * 60 * 1000
    })
  }

  // Invalidate group detail
  const invalidateGroup = () => {
    queryClient.invalidateQueries({ queryKey: ['group', groupId] })
  }

  // Update group optimistically
  const updateGroupOptimistically = (updater: (oldData: GroupDetail) => GroupDetail) => {
    queryClient.setQueryData(['group', groupId], updater)
  }

  return {
    group: groupQuery.data,
    isLoading: groupQuery.isLoading,
    isError: groupQuery.isError,
    error: groupQuery.error,
    isFetching: groupQuery.isFetching,

    // Actions
    prefetchGroup,
    invalidateGroup,
    updateGroupOptimistically
  }
}
