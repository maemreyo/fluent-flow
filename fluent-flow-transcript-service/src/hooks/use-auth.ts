'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { getCurrentUser, onAuthStateChange, signOut } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error getting current user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      } else if (unsubscribe?.data?.subscription) {
        unsubscribe.data.subscription.unsubscribe()
      }
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user,
    loading,
    signOut: handleSignOut,
    isAuthenticated: !!user,
  }
}

export function useAdminAuth() {
  const { user, loading, ...rest } = useAuth()
  
  const isAdmin = user ? (
    user.user_metadata?.role === 'admin' || 
    (user as any).raw_user_meta_data?.role === 'admin'
  ) : false

  return {
    user,
    loading,
    isAdmin,
    ...rest,
  }
}