import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { getAuthHeaders } from '../lib/supabase/auth-utils'

interface JoinGroupByCodeResponse {
  message: string
  group: {
    id: string
    name: string
    description: string
  }
}

export function useJoinGroupByCode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const joinGroupMutation = useMutation({
    mutationFn: async (code: string): Promise<JoinGroupByCodeResponse> => {
      if (!code || !user) {
        throw new Error('Invalid request')
      }

      const headers = await getAuthHeaders()
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: code.toUpperCase() })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join group')
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
    }
  })

  return {
    joinGroup: joinGroupMutation.mutate,
    isJoining: joinGroupMutation.isPending,
    error: joinGroupMutation.error?.message,
    isSuccess: joinGroupMutation.isSuccess,
    data: joinGroupMutation.data,
    reset: joinGroupMutation.reset
  }
}