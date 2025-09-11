import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

export interface ProfileData {
  username: string
  email: string
  fullName: string
  bio: string
  location: string
  website: string
  joinedDate: string
  avatar?: string
}

export function useProfile() {
  const { user } = useAuth()
  
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    email: '',
    fullName: '',
    bio: '',
    location: '',
    website: '',
    joinedDate: '',
    avatar: undefined
  })

  const [editData, setEditData] = useState<ProfileData>(profileData)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize profile data from user
  useEffect(() => {
    if (user) {
      const initialData: ProfileData = {
        username: user.user_metadata?.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        fullName: user.user_metadata?.full_name || '',
        bio: user.user_metadata?.bio || '',
        location: user.user_metadata?.location || '',
        website: user.user_metadata?.website || '',
        joinedDate: user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
        avatar: user.user_metadata?.avatar_url
      }
      setProfileData(initialData)
      setEditData(initialData)
    }
  }, [user])

  const handleEdit = () => {
    setEditData(profileData)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditData(profileData)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!supabase || !user?.id) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          username: editData.username,
          full_name: editData.fullName,
          bio: editData.bio,
          location: editData.location,
          website: editData.website
        }
      })
      
      if (error) {
        console.error('Error updating profile:', error)
        alert('Failed to update profile. Please try again.')
        return
      }
      
      setProfileData(editData)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    }
    setIsLoading(false)
  }

  const updateEditData = (field: keyof ProfileData, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  return {
    profileData,
    editData,
    isEditing,
    isLoading,
    handleEdit,
    handleCancel,
    handleSave,
    updateEditData
  }
}