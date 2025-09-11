'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { getCurrentUser, supabase } from '../lib/supabase/client'

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
  redirectToLogin: (currentPath?: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  // Optimized single auth initialization - avoid redundant API calls
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
        // Use getSession instead of getUser to avoid extra API call
        // onAuthStateChange will handle the initial state
        const {
          data: { session }
        } = await supabase.auth.getSession()

        if (mounted) {
          setAuthState({
            user: session?.user || null,
            isAuthenticated: !!session?.user,
            isLoading: false,
            error: null
          })
        }

        // Set up SINGLE auth state change listener - this handles all auth state changes
        const {
          data: { subscription }
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return

          console.log('Auth Context: Auth state changed:', event)

          // Direct state update - no debounce needed, no additional API calls
          setAuthState(prev => ({
            ...prev,
            user: session?.user || null,
            isAuthenticated: !!session?.user,
            isLoading: false,
            error: null
          }))
        })

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

  const signOut = useCallback(async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()
      // Auth state will be updated via listener
    } catch (error) {
      console.error('Auth Context: Error signing out:', error)
    }
  }, [])

  const refreshAuth = useCallback(async () => {
    if (!supabase) return

    try {
      // Use getSession instead of getUser to avoid unnecessary API calls
      // The auth listener will handle most state changes automatically
      const {
        data: { session }
      } = await supabase.auth.getSession()
      setAuthState(prev => ({
        ...prev,
        user: session?.user || null,
        isAuthenticated: !!session?.user,
        error: null
      }))
    } catch (error: any) {
      console.error('RefreshAuth error:', error)
      setAuthState(prev => ({
        ...prev,
        error: error.message
      }))
    }
  }, [])

  const redirectToLogin = useCallback((currentPath?: string) => {
    const redirectTo = currentPath || window.location.pathname
    const loginUrl = `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`
    router.replace(loginUrl)
  }, [router])

  const contextValue: AuthContextType = useMemo(
    () => ({
      ...authState,
      signOut,
      refreshAuth,
      redirectToLogin,
      hasValidSession: authState.isAuthenticated && !!authState.user
    }),
    [authState, signOut, refreshAuth, redirectToLogin]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Backward compatibility hook - optimized to avoid redundant setSession calls
export function useQuizAuth(authToken?: string) {
  const auth = useAuth()

  // Handle auth token if provided (for quiz pages) - but only once per token
  useEffect(() => {
    if (authToken && supabase && !auth.isAuthenticated) {
      const authenticateWithToken = async () => {
        try {
          // Only set session if we're not already authenticated
          // This prevents unnecessary API calls
          const { data: currentSession } = (await supabase?.auth.getSession()) || {
            data: { session: null }
          }
          if (currentSession.session?.access_token === authToken) {
            console.debug('Already authenticated with this token')
            return
          }

          const result = await supabase?.auth.setSession({
            access_token: authToken,
            refresh_token: authToken
          })
          
          if (!result) {
            throw new Error('Supabase client not available')
          }
          
          const { data, error } = result

          if (error) {
            console.error('Auth token error:', error)
          } else {
            console.debug('Successfully authenticated with token')
          }
        } catch (error) {
          console.error('Authentication with token failed:', error)
        }
      }

      authenticateWithToken()
    }
  }, [authToken, auth.isAuthenticated])

  return auth
}
