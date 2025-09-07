import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { GroupsService, UpdateGroupData, Group } from '../lib/services/groups-service'

const groupsService = new GroupsService()

export function useGroupSettings() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const saveGroupSettings = async (groupId: string, formData: UpdateGroupData): Promise<Group | null> => {
    setIsSaving(true)
    try {
      const updatedGroup = await groupsService.updateGroup(groupId, formData)
      toast.success('Group settings updated successfully')
      return updatedGroup
    } catch (error: any) {
      console.error('Error saving group settings:', error)
      
      // Handle specific error types with user-friendly messages
      if (error.message.includes('Authentication required')) {
        toast.error('Authentication required. Please refresh the page.')
      } else if (error.message.includes('permission')) {
        toast.error('You do not have permission to modify these settings.')
      } else {
        toast.error('Failed to save settings. Please try again.')
      }
      
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const deleteGroup = async (groupId: string): Promise<boolean> => {
    setIsDeleting(true)
    try {
      await groupsService.deleteGroup(groupId)
      toast.success('Group deleted successfully')
      router.push('/groups')
      return true
    } catch (error: any) {
      console.error('Error deleting group:', error)
      
      // Handle specific error types with user-friendly messages
      if (error.message.includes('Authentication required')) {
        toast.error('Authentication required. Please refresh the page.')
      } else if (error.message.includes('Only group owners')) {
        toast.error('Only group owners can delete groups.')
      } else {
        toast.error('Failed to delete group. Please try again.')
      }
      
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    saveGroupSettings,
    deleteGroup,
    isSaving,
    isDeleting
  }
}