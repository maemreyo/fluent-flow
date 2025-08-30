import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase/client'
import { useAuthenticationQuery, invalidateAuth } from './use-authentication-query'

/**
 * Enhanced authentication hook using React Query
 * Replaces manual state management with proper caching
 */
export function useAuthentication() {
  const queryClient = useQueryClient()
  const { data: user, isLoading: checkingAuth, refetch: checkAuthStatus } = useAuthenticationQuery()

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // Invalidate auth cache instead of manually setting state
      await invalidateAuth(queryClient)
      console.log('User signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user,
    checkingAuth,
    checkAuthStatus,
    signOut
  }
}