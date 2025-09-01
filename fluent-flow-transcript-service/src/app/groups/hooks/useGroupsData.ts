import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchGroups } from '../queries'
import { StudyGroup } from '../types'

interface UseGroupsDataProps {
  isAuthenticated: boolean
}

export const useGroupsData = ({ isAuthenticated }: UseGroupsDataProps) => {
  const queryClient = useQueryClient()

  // Query cho My Groups
  const myGroupsQuery = useQuery({
    queryKey: ['groups', 'my-groups'],
    queryFn: () => fetchGroups('my-groups'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 phút - my groups ít thay đổi
    refetchOnWindowFocus: false,
    retry: 2
  })

  // Query cho Public Groups
  const publicGroupsQuery = useQuery({
    queryKey: ['groups', 'public'],
    queryFn: () => fetchGroups('public'),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 phút - public groups thay đổi thường xuyên hơn
    refetchOnWindowFocus: false,
    retry: 2,
    refetchInterval: 5 * 60 * 1000 // Auto refresh mỗi 5 phút cho public groups
  })

  // Helper functions
  const getGroupsForTab = (tab: 'my-groups' | 'public'): StudyGroup[] => {
    if (tab === 'my-groups') {
      return myGroupsQuery.data || []
    }
    return publicGroupsQuery.data || []
  }

  const getLoadingStateForTab = (tab: 'my-groups' | 'public'): boolean => {
    if (tab === 'my-groups') {
      return myGroupsQuery.isLoading
    }
    return publicGroupsQuery.isLoading
  }

  const getErrorStateForTab = (tab: 'my-groups' | 'public') => {
    if (tab === 'my-groups') {
      return { isError: myGroupsQuery.isError, error: myGroupsQuery.error }
    }
    return { isError: publicGroupsQuery.isError, error: publicGroupsQuery.error }
  }

  // Prefetch function cho tab khác
  const prefetchTab = (tab: 'my-groups' | 'public') => {
    queryClient.prefetchQuery({
      queryKey: ['groups', tab],
      queryFn: () => fetchGroups(tab),
      staleTime: tab === 'my-groups' ? 5 * 60 * 1000 : 2 * 60 * 1000
    })
  }

  // Invalidate specific tab
  const invalidateTab = (tab: 'my-groups' | 'public') => {
    queryClient.invalidateQueries({ queryKey: ['groups', tab] })
  }

  // Invalidate all groups
  const invalidateAllGroups = () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  }

  // Optimistic update helper
  const updateGroupOptimistically = (
    tab: 'my-groups' | 'public',
    updater: (oldData: StudyGroup[]) => StudyGroup[]
  ) => {
    queryClient.setQueryData(['groups', tab], updater)
  }

  return {
    // Queries
    myGroupsQuery,
    publicGroupsQuery,

    // Helper functions
    getGroupsForTab,
    getLoadingStateForTab,
    getErrorStateForTab,

    // Actions
    prefetchTab,
    invalidateTab,
    invalidateAllGroups,
    updateGroupOptimistically
  }
}
