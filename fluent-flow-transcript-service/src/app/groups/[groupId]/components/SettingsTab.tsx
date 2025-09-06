'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '../../../../contexts/AuthContext'
import { PermissionManager } from '../../../../lib/permissions'

import { BasicInfoForm } from './settings/BasicInfoForm'
import { LearningSettingsForm } from './settings/LearningSettingsForm'
import { PrivacySettingsForm } from './settings/PrivacySettingsForm'
import { TagsForm } from './settings/TagsForm'
import { DangerZone } from './settings/DangerZone'

interface SettingsTabProps {
  group: {
    id: string
    name: string
    description?: string
    language: string
    level: string
    isPrivate: boolean
    maxMembers?: number
    tags?: string[]
    groupCode?: string
    user_role?: string
    settings?: {
      shuffleQuestions?: boolean
    }
  } | null
}

export function SettingsTab({ group }: SettingsTabProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  
  // Centralized permission management
  const permissions = new PermissionManager(user, group, null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    language: group?.language || 'English',
    level: group?.level || 'intermediate',
    isPrivate: group?.isPrivate || false,
    maxMembers: group?.maxMembers || 20,
    tags: group?.tags || [],
    shuffleQuestions: group?.settings?.shuffleQuestions || false
  })

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Loading group settings...
        </div>
      </div>
    )
  }

  if (!permissions.canManageGroup()) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Group Settings</h2>
          <p className="text-muted-foreground">
            Manage your study group configuration and preferences.
          </p>
        </div>
        <Alert>
          <AlertDescription>
            Only group {permissions.isOwner() ? 'owners' : 'owners and admins'} can access and modify settings.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          is_private: formData.isPrivate,
          max_members: formData.maxMembers,
          // Note: language, level, and tags might need separate API endpoints
          language: formData.language,
          level: formData.level,
          tags: formData.tags,
          settings: {
            shuffleQuestions: formData.shuffleQuestions
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      
      toast.success('Group settings updated successfully')
    } catch (error) {
      toast.error('Failed to save settings. Please try again.')
      console.error('Error saving group settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete group')
      }
      
      toast.success('Group deleted successfully')
      router.push('/groups')
    } catch (error) {
      toast.error('Failed to delete group. Please try again.')
      console.error('Error deleting group:', error)
    }
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    name: group.name,
    description: group.description,
    language: group.language,
    level: group.level,
    isPrivate: group.isPrivate,
    maxMembers: group.maxMembers,
    tags: group.tags,
    shuffleQuestions: group.settings?.shuffleQuestions || false
  })

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Group Settings</h2>
        <p className="text-muted-foreground">
          Manage your study group configuration and preferences.
        </p>
      </div>

      <div className="space-y-6">
        <BasicInfoForm
          name={formData.name}
          description={formData.description}
          groupCode={group.groupCode || null}
          onNameChange={(name) => setFormData(prev => ({ ...prev, name }))}
          onDescriptionChange={(description) => setFormData(prev => ({ ...prev, description }))}
        />

        <LearningSettingsForm
          language={formData.language}
          level={formData.level}
          shuffleQuestions={formData.shuffleQuestions}
          onLanguageChange={(language) => setFormData(prev => ({ ...prev, language }))}
          onLevelChange={(level) => setFormData(prev => ({ ...prev, level }))}
          onShuffleQuestionsChange={(shuffleQuestions) => setFormData(prev => ({ ...prev, shuffleQuestions }))}
        />

        <PrivacySettingsForm
          isPrivate={formData.isPrivate}
          maxMembers={formData.maxMembers}
          onPrivateChange={(isPrivate) => setFormData(prev => ({ ...prev, isPrivate }))}
          onMaxMembersChange={(maxMembers) => setFormData(prev => ({ ...prev, maxMembers }))}
        />

        <TagsForm
          tags={formData.tags}
          onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 pt-6 border-t">
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setFormData({
            name: group.name,
            description: group.description || '',
            language: group.language,
            level: group.level,
            isPrivate: group.isPrivate,
            maxMembers: group.maxMembers || 20,
            tags: group.tags || [],
            shuffleQuestions: group.settings?.shuffleQuestions || false
          })}
          disabled={!hasChanges}
        >
          Cancel
        </Button>
      </div>

      <Separator />

      <DangerZone
        groupName={group.name}
        onDeleteGroup={handleDeleteGroup}
      />
    </div>
  )
}