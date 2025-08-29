import { useState, useEffect } from 'react'
import { getCurrentUser, supabase } from '../supabase/client'

/**
 * Custom hook for managing authentication state
 */
export function useAuthentication() {
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const checkAuthStatus = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error checking auth status:', error)
    } finally {
      setCheckingAuth(false)
    }
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
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