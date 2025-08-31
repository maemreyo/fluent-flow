import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { authenticateWithToken, getCurrentUser, supabase } from '../supabase/client'

interface QuizAuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Authentication hook for Quiz page
 * Handles authentication from shared session tokens
 */
export const useQuizAuth = (authToken?: string) => {
  const [authState, setAuthState] = useState<QuizAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      if (!supabase) {
        if (mounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Supabase not configured'
          })
        }
        return
      }

      try {
        // If auth token provided, authenticate with it
        if (authToken) {
          console.log('Quiz Auth: Authenticating with provided token')
          const result = await authenticateWithToken(authToken)
          
          if (result.success && mounted) {
            setAuthState({
              user: result.user || null,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            return
          }
        }

        // Check existing session
        const user = await getCurrentUser()
        
        if (mounted) {
          setAuthState({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null
          })
        }
      } catch (error: any) {
        console.error('Quiz Auth: Error initializing auth:', error)
        
        if (mounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Authentication failed'
          })
        }
      }
    }

    initializeAuth()

    // Set up auth state change listener
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      console.log('Quiz Auth: Auth state changed:', event)
      
      setAuthState(prev => ({
        ...prev,
        user: session?.user || null,
        isAuthenticated: !!session?.user,
        isLoading: false
      }))
    }) || { data: { subscription: null } }

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [authToken])

  const signOut = async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Quiz Auth: Error signing out:', error)
    }
  }

  return {
    ...authState,
    signOut,
    hasValidSession: authState.isAuthenticated && !!authState.user
  }
}