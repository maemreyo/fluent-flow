'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '../../../../contexts/AuthContext'
import { PermissionManager } from '../../../../lib/permissions'
import { useGroupSettings } from '../../../../hooks/useGroupSettings'
import { UpdateGroupData } from '../../../../lib/services/groups-service'

import { BasicInfoForm } from './settings/BasicInfoForm'
import { LearningSettingsForm } from './settings/LearningSettingsForm'
import { PrivacySettingsForm } from './settings/PrivacySettingsForm'
import { TagsForm } from './settings/TagsForm'
import { DangerZone } from './settings/DangerZone'
import { RoleManagementForm } from './settings/RoleManagementForm'
import { SessionControlForm } from './settings/SessionControlForm'

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
      // Role Management Settings
      allowMemberInvitations?: boolean
      requireApprovalForJoining?: boolean
      maxAdminCount?: number
      adminCanManageMembers?: boolean
      adminCanDeleteSessions?: boolean
      
      // Session Control Settings
      onlyAdminsCanCreateSessions?: boolean
      onlyAdminsCanStartQuiz?: boolean
      maxConcurrentSessions?: number
      requireSessionApproval?: boolean
      allowQuizRetakes?: boolean
      
      // Enhanced Quiz Settings
      shuffleQuestions?: boolean
      shuffleAnswers?: boolean
      showCorrectAnswers?: boolean
      defaultQuizTimeLimit?: number
      enforceQuizTimeLimit?: boolean
      allowSkippingQuestions?: boolean
    }
  } | null
}

export function SettingsTab({ group }: SettingsTabProps) {
  const { user } = useAuth()
  const { saveGroupSettings, deleteGroup, isSaving, isDeleting } = useGroupSettings()
  
  // Centralized permission management
  const permissions = new PermissionManager(user, group, null)
  
  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: group?.name || '',
    description: group?.description || '',
    language: group?.language || 'English',
    level: group?.level || 'intermediate',
    isPrivate: group?.isPrivate || false,
    maxMembers: group?.maxMembers || 20,
    tags: group?.tags || [],
    
    // Role Management Settings
    allowMemberInvitations: group?.settings?.allowMemberInvitations || false,
    requireApprovalForJoining: group?.settings?.requireApprovalForJoining || false,
    maxAdminCount: group?.settings?.maxAdminCount || 3,
    adminCanManageMembers: group?.settings?.adminCanManageMembers !== false, // Default true
    adminCanDeleteSessions: group?.settings?.adminCanDeleteSessions !== false, // Default true
    
    // Session Control Settings
    onlyAdminsCanCreateSessions: group?.settings?.onlyAdminsCanCreateSessions || false,
    onlyAdminsCanStartQuiz: group?.settings?.onlyAdminsCanStartQuiz || false,
    maxConcurrentSessions: group?.settings?.maxConcurrentSessions || 5,
    requireSessionApproval: group?.settings?.requireSessionApproval || false,
    allowQuizRetakes: group?.settings?.allowQuizRetakes !== false, // Default true
    
    // Enhanced Quiz Settings
    shuffleQuestions: group?.settings?.shuffleQuestions || false,
    shuffleAnswers: group?.settings?.shuffleAnswers || false,
    showCorrectAnswers: group?.settings?.showCorrectAnswers !== false, // Default true
    defaultQuizTimeLimit: group?.settings?.defaultQuizTimeLimit || 30,
    enforceQuizTimeLimit: group?.settings?.enforceQuizTimeLimit || false,
    allowSkippingQuestions: group?.settings?.allowSkippingQuestions || false
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
    if (!group) return

    const updateData: UpdateGroupData = {
      name: formData.name,
      description: formData.description,
      is_private: formData.isPrivate,
      max_members: formData.maxMembers,
      language: formData.language,
      level: formData.level,
      tags: formData.tags,
      settings: {
        // Role Management Settings
        allowMemberInvitations: formData.allowMemberInvitations,
        requireApprovalForJoining: formData.requireApprovalForJoining,
        maxAdminCount: formData.maxAdminCount,
        adminCanManageMembers: formData.adminCanManageMembers,
        adminCanDeleteSessions: formData.adminCanDeleteSessions,
        
        // Session Control Settings
        onlyAdminsCanCreateSessions: formData.onlyAdminsCanCreateSessions,
        onlyAdminsCanStartQuiz: formData.onlyAdminsCanStartQuiz,
        maxConcurrentSessions: formData.maxConcurrentSessions,
        requireSessionApproval: formData.requireSessionApproval,
        allowQuizRetakes: formData.allowQuizRetakes,
        
        // Enhanced Quiz Settings
        shuffleQuestions: formData.shuffleQuestions,
        shuffleAnswers: formData.shuffleAnswers,
        showCorrectAnswers: formData.showCorrectAnswers,
        defaultQuizTimeLimit: formData.defaultQuizTimeLimit,
        enforceQuizTimeLimit: formData.enforceQuizTimeLimit,
        allowSkippingQuestions: formData.allowSkippingQuestions
      }
    }

    await saveGroupSettings(group.id, updateData)
  }

  const handleDeleteGroup = async () => {
    if (!group) return
    await deleteGroup(group.id)
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    name: group.name,
    description: group.description,
    language: group.language,
    level: group.level,
    isPrivate: group.isPrivate,
    maxMembers: group.maxMembers,
    tags: group.tags,
    // Role Management Settings
    allowMemberInvitations: group.settings?.allowMemberInvitations || false,
    requireApprovalForJoining: group.settings?.requireApprovalForJoining || false,
    maxAdminCount: group.settings?.maxAdminCount || 3,
    adminCanManageMembers: group.settings?.adminCanManageMembers !== false,
    adminCanDeleteSessions: group.settings?.adminCanDeleteSessions !== false,
    // Session Control Settings
    onlyAdminsCanCreateSessions: group.settings?.onlyAdminsCanCreateSessions || false,
    onlyAdminsCanStartQuiz: group.settings?.onlyAdminsCanStartQuiz || false,
    maxConcurrentSessions: group.settings?.maxConcurrentSessions || 5,
    requireSessionApproval: group.settings?.requireSessionApproval || false,
    allowQuizRetakes: group.settings?.allowQuizRetakes !== false,
    // Enhanced Quiz Settings
    shuffleQuestions: group.settings?.shuffleQuestions || false,
    shuffleAnswers: group.settings?.shuffleAnswers || false,
    showCorrectAnswers: group.settings?.showCorrectAnswers !== false,
    defaultQuizTimeLimit: group.settings?.defaultQuizTimeLimit || 30,
    enforceQuizTimeLimit: group.settings?.enforceQuizTimeLimit || false,
    allowSkippingQuestions: group.settings?.allowSkippingQuestions || false
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
          shuffleAnswers={formData.shuffleAnswers}
          showCorrectAnswers={formData.showCorrectAnswers}
          defaultQuizTimeLimit={formData.defaultQuizTimeLimit}
          enforceQuizTimeLimit={formData.enforceQuizTimeLimit}
          allowSkippingQuestions={formData.allowSkippingQuestions}
          onLanguageChange={(language) => setFormData(prev => ({ ...prev, language }))}
          onLevelChange={(level) => setFormData(prev => ({ ...prev, level }))}
          onShuffleQuestionsChange={(shuffleQuestions) => setFormData(prev => ({ ...prev, shuffleQuestions }))}
          onShuffleAnswersChange={(shuffleAnswers) => setFormData(prev => ({ ...prev, shuffleAnswers }))}
          onShowCorrectAnswersChange={(showCorrectAnswers) => setFormData(prev => ({ ...prev, showCorrectAnswers }))}
          onDefaultQuizTimeLimitChange={(defaultQuizTimeLimit) => setFormData(prev => ({ ...prev, defaultQuizTimeLimit }))}
          onEnforceQuizTimeLimitChange={(enforceQuizTimeLimit) => setFormData(prev => ({ ...prev, enforceQuizTimeLimit }))}
          onAllowSkippingQuestionsChange={(allowSkippingQuestions) => setFormData(prev => ({ ...prev, allowSkippingQuestions }))}
        />

        <RoleManagementForm
          allowMemberInvitations={formData.allowMemberInvitations}
          requireApprovalForJoining={formData.requireApprovalForJoining}
          maxAdminCount={formData.maxAdminCount}
          adminCanManageMembers={formData.adminCanManageMembers}
          adminCanDeleteSessions={formData.adminCanDeleteSessions}
          onAllowMemberInvitationsChange={(allowMemberInvitations) => setFormData(prev => ({ ...prev, allowMemberInvitations }))}
          onRequireApprovalChange={(requireApprovalForJoining) => setFormData(prev => ({ ...prev, requireApprovalForJoining }))}
          onMaxAdminCountChange={(maxAdminCount) => setFormData(prev => ({ ...prev, maxAdminCount }))}
          onAdminCanManageMembersChange={(adminCanManageMembers) => setFormData(prev => ({ ...prev, adminCanManageMembers }))}
          onAdminCanDeleteSessionsChange={(adminCanDeleteSessions) => setFormData(prev => ({ ...prev, adminCanDeleteSessions }))}
        />

        <SessionControlForm
          onlyAdminsCanCreateSessions={formData.onlyAdminsCanCreateSessions}
          onlyAdminsCanStartQuiz={formData.onlyAdminsCanStartQuiz}
          maxConcurrentSessions={formData.maxConcurrentSessions}
          requireSessionApproval={formData.requireSessionApproval}
          allowQuizRetakes={formData.allowQuizRetakes}
          onOnlyAdminsCanCreateSessionsChange={(onlyAdminsCanCreateSessions) => setFormData(prev => ({ ...prev, onlyAdminsCanCreateSessions }))}
          onOnlyAdminsCanStartQuizChange={(onlyAdminsCanStartQuiz) => setFormData(prev => ({ ...prev, onlyAdminsCanStartQuiz }))}
          onMaxConcurrentSessionsChange={(maxConcurrentSessions) => setFormData(prev => ({ ...prev, maxConcurrentSessions }))}
          onRequireSessionApprovalChange={(requireSessionApproval) => setFormData(prev => ({ ...prev, requireSessionApproval }))}
          onAllowQuizRetakesChange={(allowQuizRetakes) => setFormData(prev => ({ ...prev, allowQuizRetakes }))}
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
            // Basic Info
            name: group.name,
            description: group.description || '',
            language: group.language,
            level: group.level,
            isPrivate: group.isPrivate,
            maxMembers: group.maxMembers || 20,
            tags: group.tags || [],
            
            // Role Management Settings
            allowMemberInvitations: group.settings?.allowMemberInvitations || false,
            requireApprovalForJoining: group.settings?.requireApprovalForJoining || false,
            maxAdminCount: group.settings?.maxAdminCount || 3,
            adminCanManageMembers: group.settings?.adminCanManageMembers !== false,
            adminCanDeleteSessions: group.settings?.adminCanDeleteSessions !== false,
            
            // Session Control Settings
            onlyAdminsCanCreateSessions: group.settings?.onlyAdminsCanCreateSessions || false,
            onlyAdminsCanStartQuiz: group.settings?.onlyAdminsCanStartQuiz || false,
            maxConcurrentSessions: group.settings?.maxConcurrentSessions || 5,
            requireSessionApproval: group.settings?.requireSessionApproval || false,
            allowQuizRetakes: group.settings?.allowQuizRetakes !== false,
            
            // Enhanced Quiz Settings
            shuffleQuestions: group.settings?.shuffleQuestions || false,
            shuffleAnswers: group.settings?.shuffleAnswers || false,
            showCorrectAnswers: group.settings?.showCorrectAnswers !== false,
            defaultQuizTimeLimit: group.settings?.defaultQuizTimeLimit || 30,
            enforceQuizTimeLimit: group.settings?.enforceQuizTimeLimit || false,
            allowSkippingQuestions: group.settings?.allowSkippingQuestions || false
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