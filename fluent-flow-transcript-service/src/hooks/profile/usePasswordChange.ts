import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

interface UsePasswordChangeOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function usePasswordChange({ onSuccess, onError }: UsePasswordChangeOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!supabase) {
      const error = 'Authentication service not available'
      setError(error)
      onError?.(error)
      return false
    }

    setIsLoading(true)
    setError('')

    try {
      // First verify current password by attempting to sign in with it
      const { data: user } = await supabase.auth.getUser()
      if (!user.user?.email) {
        throw new Error('User email not found')
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.user.email,
        password: currentPassword
      })

      if (signInError) {
        const error = 'Current password is incorrect'
        setError(error)
        onError?.(error)
        return false
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        setError(updateError.message)
        onError?.(updateError.message)
        return false
      }

      onSuccess?.()
      return true
    } catch (err: any) {
      const error = err.message || 'An unexpected error occurred'
      setError(error)
      onError?.(error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError])

  return {
    changePassword,
    isLoading,
    error,
    clearError: () => setError('')
  }
}