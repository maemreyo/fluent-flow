import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../supabase/client'

// Authentication query key
const authQueryKey = ['auth', 'user'] as const

/**
 * React Query hook for authentication state
 * Replaces the manual useState/useEffect pattern with proper caching
 */
export function useAuthenticationQuery() {
  return useQuery({
    queryKey: authQueryKey,
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes - auth data is relatively stable
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry auth failures as they're likely permanent
      return false
    },
    refetchOnWindowFocus: false, // Don't refetch on window focus for auth
    refetchOnMount: false, // Don't refetch on every mount
  })
}

/**
 * Get cached auth data synchronously if available
 */
export function getCachedAuthUser(queryClient: any) {
  return queryClient.getQueryData(authQueryKey)
}

/**
 * Invalidate auth cache (useful for logout)
 */
export function invalidateAuth(queryClient: any) {
  return queryClient.invalidateQueries({ queryKey: authQueryKey })
}

/**
 * Set auth data in cache (useful for login)
 */
export function setAuthData(queryClient: any, userData: any) {
  return queryClient.setQueryData(authQueryKey, userData)
}