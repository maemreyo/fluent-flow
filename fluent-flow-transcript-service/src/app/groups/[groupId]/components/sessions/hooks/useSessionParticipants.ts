import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  fetchSessionParticipants, 
  joinSession, 
  leaveSession,
  SessionParticipant 
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

  // Query participants with polling
  const participantsQuery = useQuery({
    queryKey: ['session-participants', groupId, sessionId],
    queryFn: () => fetchSessionParticipants(groupId, sessionId),
    enabled,
    refetchInterval: 5000, // Poll every 5 seconds
    refetchIntervalInBackground: false,
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 30 * 1000, // Keep in cache for 30 seconds
  })

  // Join session mutation
  const joinMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('User ID is required')
      return joinSession(groupId, sessionId, userId)
    },
    onSuccess: () => {
      toast.success('Successfully joined the quiz room!')
      // Immediately refetch participants
      queryClient.invalidateQueries({
        queryKey: ['session-participants', groupId, sessionId]
      })
    },
    onError: (error: Error) => {
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
    onSuccess: () => {
      toast.success('Left the quiz room')
      // Immediately refetch participants
      queryClient.invalidateQueries({
        queryKey: ['session-participants', groupId, sessionId]
      })
    },
    onError: (error: Error) => {
      console.error('Error leaving session:', error)
      if (error.message.includes('Authentication required')) {
        toast.error('Authentication required. Please refresh the page.')
      } else {
        toast.error('Failed to leave quiz room')
      }
    }
  })

  // Derived state
  const participants = participantsQuery.data?.participants || []
  const onlineParticipants = participants.filter(p => p.is_online)
  const isUserJoined = participants.some(p => p.user_id === userId)

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
      queryKey: ['session-participants', groupId, sessionId]
    })
  }
}