import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  fetchSessionParticipants, 
  joinSession, 
  leaveSession
} from '../queries'

interface UseSessionParticipantsProps {
  groupId: string
  sessionId: string
  userId?: string
  enabled?: boolean
}

export const useSessionParticipants = ({ 
  groupId, 
  sessionId, 
  userId,
  enabled = true 
}: UseSessionParticipantsProps) => {
  const queryClient = useQueryClient()

  // Import query keys directly instead of dynamic require
  const quizQueryKeys = {
    sessionParticipants: (groupId: string, sessionId: string) => ['session-participants', groupId, sessionId]
  }
  
  const quizQueryOptions = {
    realtime: { 
      staleTime: 30 * 1000, 
      gcTime: 2 * 60 * 1000,
      refetchInterval: false,
      refetchOnWindowFocus: false 
    }
  }

  // Query participants with manual refresh only
  const participantsQuery = useQuery({
    queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId),
    queryFn: () => fetchSessionParticipants(groupId, sessionId),
    enabled,
    ...quizQueryOptions.realtime,
    // DISABLED: No automatic refetching - use manual refresh button instead
    refetchInterval: false, // Disabled continuous fetching
    refetchIntervalInBackground: false,
    refetchOnMount: 'always', // Fresh data on initial mount only
    refetchOnWindowFocus: false // No refetch on window focus
  })

  // Derived state
  const participants = participantsQuery.data?.participants || []
  const onlineParticipants = participants.filter(p => p.is_online)
  const isUserJoined = participants.some(p => p.user_id === userId && p.is_online)

  // Join session mutation
  const joinMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('User ID is required')
      return joinSession(groupId, sessionId, userId)
    },
    onMutate: async () => {
      // Optimistically update the cache
      await queryClient.cancelQueries({
        queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
      })
      
      const previousData = queryClient.getQueryData(quizQueryKeys.sessionParticipants(groupId, sessionId))
      
      queryClient.setQueryData(quizQueryKeys.sessionParticipants(groupId, sessionId), (old: any) => {
        if (!old) return old
        
        const existingParticipant = old.participants.find((p: any) => p.user_id === userId)
        if (existingParticipant) {
          // Update existing participant to online
          return {
            ...old,
            participants: old.participants.map((p: any) => 
              p.user_id === userId ? { ...p, is_online: true } : p
            ),
            online: old.online + (existingParticipant.is_online ? 0 : 1)
          }
        }
        
        return old
      })
      
      return { previousData }
    },
    onSuccess: () => {
      toast.success('Successfully joined the quiz room!')
      // Refetch to get the latest data
      queryClient.invalidateQueries({
        queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
      })
    },
    onError: (error: Error, _variables, context: any) => {
      // Revert optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(quizQueryKeys.sessionParticipants(groupId, sessionId), context.previousData)
      }
      
      console.error('Error joining session:', error)
      if (error.message.includes('Authentication required')) {
        toast.error('Authentication required. Please refresh the page.')
      } else {
        toast.error(error.message || 'Failed to join quiz room')
      }
    }
  })

  // Leave session mutation  
  const leaveMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('User ID is required')
      return leaveSession(groupId, sessionId, userId)
    },
    onMutate: async () => {
      // Optimistically update the cache
      await queryClient.cancelQueries({
        queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
      })
      
      const previousData = queryClient.getQueryData(quizQueryKeys.sessionParticipants(groupId, sessionId))
      
      queryClient.setQueryData(quizQueryKeys.sessionParticipants(groupId, sessionId), (old: any) => {
        if (!old) return old
        
        const existingParticipant = old.participants.find((p: any) => p.user_id === userId)
        if (existingParticipant && existingParticipant.is_online) {
          // Update existing participant to offline
          return {
            ...old,
            participants: old.participants.map((p: any) => 
              p.user_id === userId ? { ...p, is_online: false } : p
            ),
            online: Math.max(0, old.online - 1)
          }
        }
        
        return old
      })
      
      return { previousData }
    },
    onSuccess: () => {
      toast.success('Left the quiz room')
      // Refetch to get the latest data
      queryClient.invalidateQueries({
        queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
      })
    },
    onError: (error: Error, _variables, context: any) => {
      // Revert optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(quizQueryKeys.sessionParticipants(groupId, sessionId), context.previousData)
      }
      
      console.error('Error leaving session:', error)
      if (error.message.includes('Authentication required')) {
        toast.error('Authentication required. Please refresh the page.')
      } else {
        toast.error('Failed to leave quiz room')
      }
    }
  })

  return {
    // Data
    participants,
    onlineParticipants,
    isUserJoined,
    participantsCount: participantsQuery.data?.total || 0,
    onlineCount: participantsQuery.data?.online || 0,

    // Query state
    isLoading: participantsQuery.isLoading,
    isError: participantsQuery.isError,
    error: participantsQuery.error,
    isFetching: participantsQuery.isFetching,

    // Mutations
    joinSession: joinMutation.mutate,
    leaveSession: leaveMutation.mutate,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,

    // Actions
    refetch: participantsQuery.refetch,
    invalidate: () => queryClient.invalidateQueries({
      queryKey: quizQueryKeys.sessionParticipants(groupId, sessionId)
    })
  }
}