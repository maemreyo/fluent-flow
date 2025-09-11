import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface UseAvatarUploadOptions {
  onSuccess?: (avatarUrl: string) => void
  onError?: (error: string) => void
}

export function useAvatarUpload({ onSuccess, onError }: UseAvatarUploadOptions = {}) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadAvatar = useCallback(async (file: File) => {
    if (!supabase || !user?.id) {
      const error = 'Authentication service not available or user not logged in'
      setError(error)
      onError?.(error)
      return null
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      const error = 'Please select a valid image file'
      setError(error)
      onError?.(error)
      return null
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      const error = 'File size must be less than 5MB'
      setError(error)
      onError?.(error)
      return null
    }

    setIsLoading(true)
    setError('')
    setUploadProgress(0)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        setError(uploadError.message)
        onError?.(uploadError.message)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      // Update user metadata with new avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl
        }
      })

      if (updateError) {
        setError(updateError.message)
        onError?.(updateError.message)
        return null
      }

      setUploadProgress(100)
      onSuccess?.(publicUrl)
      return publicUrl
    } catch (err: any) {
      const error = err.message || 'An unexpected error occurred'
      setError(error)
      onError?.(error)
      return null
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }, [user?.id, onSuccess, onError])

  const removeAvatar = useCallback(async () => {
    if (!supabase || !user?.id) {
      const error = 'Authentication service not available or user not logged in'
      setError(error)
      onError?.(error)
      return false
    }

    setIsLoading(true)
    setError('')

    try {
      // Update user metadata to remove avatar URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: null
        }
      })

      if (updateError) {
        setError(updateError.message)
        onError?.(updateError.message)
        return false
      }

      onSuccess?.('')
      return true
    } catch (err: any) {
      const error = err.message || 'An unexpected error occurred'
      setError(error)
      onError?.(error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, onSuccess, onError])

  return {
    uploadAvatar,
    removeAvatar,
    isLoading,
    error,
    uploadProgress,
    clearError: () => setError('')
  }
}