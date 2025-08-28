import { useState, useEffect } from 'react'
import { getCurrentUser } from '../supabase/client'

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

  return {
    user,
    checkingAuth,
    checkAuthStatus
  }
}