'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getCurrentUser } from '../lib/supabase/client'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
  hasValidSession: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  // Single auth initialization
  useEffect(() => {
    let mounted = true
    let authSubscription: any = null

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
        // Get initial user
        const user = await getCurrentUser()
        
        if (mounted) {
          setAuthState({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null
          })
        }

        // Set up SINGLE auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return

            console.log('Auth Context: Auth state changed:', event)
            
            // Debounce rapid auth changes
            setTimeout(() => {
              if (!mounted) return
              
              setAuthState(prev => ({
                ...prev,
                user: session?.user || null,
                isAuthenticated: !!session?.user,
                isLoading: false,
                error: null
              }))
            }, 100)
          }
        )

        authSubscription = subscription
      } catch (error: any) {
        console.error('Auth Context: Error initializing auth:', error)
        
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

    return () => {
      mounted = false
      authSubscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()
      // Auth state will be updated via listener
    } catch (error) {
      console.error('Auth Context: Error signing out:', error)
    }
  }

  const refreshAuth = async () => {
    if (!supabase) return

    try {
      const user = await getCurrentUser()
      setAuthState(prev => ({
        ...prev,
        user,
        isAuthenticated: !!user,
        error: null
      }))
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        error: error.message
      }))
    }
  }

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    refreshAuth,
    hasValidSession: authState.isAuthenticated && !!authState.user
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Backward compatibility hook
export function useQuizAuth(authToken?: string) {
  const auth = useAuth()
  
  // Handle auth token if provided (for quiz pages)
  useEffect(() => {
    if (authToken && supabase) {
      const authenticateWithToken = async () => {
        try {
          const { data, error } = await supabase!.auth.setSession({
            access_token: authToken,
            refresh_token: authToken
          })
          
          if (error) {
            console.error('Auth token error:', error)
          }
        } catch (error) {
          console.error('Authentication with token failed:', error)
        }
      }
      
      authenticateWithToken()
    }
  }, [authToken])
  
  return auth
}