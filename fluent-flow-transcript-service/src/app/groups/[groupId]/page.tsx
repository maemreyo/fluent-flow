'use client'

import { use, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AuthPrompt } from '../../../components/auth/AuthPrompt'
import CreateSessionModal from '../../../components/sessions/CreateSessionModal'
import SessionsTab from '../../../components/sessions/SessionsTab'
import { useAuth } from '../../../contexts/AuthContext'
import { PermissionManager } from '../../../lib/permissions'
import { SessionRedirectManager } from '../../../lib/supabase/auth-utils'
import { GroupHeader } from './components/GroupHeader'
import { MembersTab } from './components/MembersTab'
import { OverviewTab } from './components/OverviewTab'
import { SettingsTab } from './components/SettingsTab'
import { StatCards } from './components/StatCards'
import { GroupTab, TabNavigation } from './components/TabNavigation'
import { useGroupDetail } from './hooks/useGroupDetail'
import { useGlobalQuizSessionListener } from './hooks/useGlobalQuizSessionListener'

export default function GroupPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ groupId: string }>
  searchParams: Promise<{ tab?: string; highlight?: string }>
}) {
  const router = useRouter()
  const { groupId } = use(params)
  const { tab: initialTab, highlight: highlightSessionId } = use(searchParams)
  const queryClient = useQueryClient()

  // Use URL tab parameter or default to 'overview'
  const [activeTab, setActiveTab] = useState<GroupTab>(
    (initialTab as GroupTab) || 'overview'
  )
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [selectedLoopId, setSelectedLoopId] = useState<string | undefined>(undefined)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const {
    group,
    isLoading: groupLoading,
    isError,
    error,
    invalidateGroup
  } = useGroupDetail({
    groupId,
    isAuthenticated
  })

  // Global quiz session listener for notifications
  const { isConnected: globalListenerConnected } = useGlobalQuizSessionListener({
    groupId,
    enabled: isAuthenticated && !!group
  })

  // Update tab based on URL parameters
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab as GroupTab)
    }
  }, [initialTab]) // Remove activeTab from deps to avoid infinite loop

  const handleTabChange = (newTab: GroupTab) => {
    console.log(`handleTabChange called with: ${newTab}, current activeTab: ${activeTab}`)
    setActiveTab(newTab)
    
    // Update URL without navigation
    const current = new URLSearchParams(window.location.search)
    current.set('tab', newTab)
    if (highlightSessionId) {
      current.set('highlight', highlightSessionId)
    }
    
    const search = current.toString()
    const query = search ? `?${search}` : ''
    
    // Use replace to avoid adding to browser history for each tab click
    window.history.replaceState(null, '', `/groups/${groupId}${query}`)
  }

  const handleAuthSuccess = async () => {
    setShowAuthPrompt(false)
    
    // Check for stored session redirect destination
    const destination = SessionRedirectManager.getAndClearIntendedDestination()
    
    if (destination?.type === 'session' && destination.groupId === groupId) {
      try {
        // Auto-join the group first
        const joinResult = await SessionRedirectManager.autoJoinGroupById(groupId)
        
        if (joinResult.success || joinResult.error?.includes('Already a member')) {
          // Redirect to the intended session after successful join/already member
          setTimeout(() => {
            router.push(`/groups/${destination.groupId}/quiz/${destination.sessionId}`)
          }, 500) // Small delay to ensure join is processed
          return
        } else {
          console.warn('Auto-join failed:', joinResult.error)
          // Still invalidate group to refresh membership status
          invalidateGroup()
        }
      } catch (error) {
        console.error('Error in seamless auth flow:', error)
        invalidateGroup()
      }
    } else {
      // Normal flow - just refresh group data
      invalidateGroup()
    }
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
    router.push('/groups')
  }

  const handleCreateSession = (loopId?: string) => {
    console.log('🚀 Opening create session modal with loop:', loopId)
    setSelectedLoopId(loopId)
    setShowCreateSession(true)
  }

  const handleCreateSessionSuccess = () => {
    setShowCreateSession(false)
    setSelectedLoopId(undefined) // Reset selected loop
    invalidateGroup()
  }

  if (authLoading || (isAuthenticated && groupLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AuthPrompt
          onClose={handleCloseAuthPrompt}
          onAuthSuccess={() => window.location.reload()}
          title="Access Group"
          subtitle="Sign in to view and participate in study groups"
        />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Error loading group</h2>
          <p className="mb-4 text-gray-600">{error?.message || 'Unknown error'}</p>
          <button
            onClick={() => router.push('/groups')}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
          >
            Back to Groups
          </button>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Group not found</h2>
          <p className="mb-4 text-gray-600">
            This group doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <button
            onClick={() => router.push('/groups')}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
          >
            Back to Groups
          </button>
        </div>
      </div>
    )
  }

  // Use PermissionManager for granular permissions
  const permissions = new PermissionManager(user, group as any, null)
  const canManage = permissions.canManageGroup()
  const canCreateSessions = permissions.canCreateSessions()
  const canInviteMembers = permissions.canInviteMembers()
  const canDeleteSessions = permissions.canDeleteSessions()

  console.log(`Rendering with activeTab: ${activeTab}, initialTab: ${initialTab}`)

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="animate-blob absolute left-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 mix-blend-multiply blur-xl filter"></div>
          <div className="animate-blob animation-delay-2000 absolute right-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 mix-blend-multiply blur-xl filter"></div>
        </div>

        <div className="container relative z-10 mx-auto max-w-7xl px-6 py-8">
          <GroupHeader
            group={group as any}
            canManage={!!canManage}
            canCreateSessions={!!canCreateSessions}
            onNewSession={() => handleCreateSession()}
          />
          <StatCards group={group as any} />
          <TabNavigation
            activeTab={activeTab}
            setActiveTab={handleTabChange} // Use the new handler
            canManage={!!canManage}
          />

          <div className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-lg backdrop-blur-sm">
            {activeTab === 'overview' && (
              <OverviewTab
                sessions={(group as any).recent_sessions || []}
                canManage={!!canManage}
                onNewSession={() => handleCreateSession()}
                groupId={groupId}
              />
            )}
            {activeTab === 'members' && (
              <MembersTab
                members={(group as any).members || []}
                memberCount={(group as any).member_count || 0}
                canManage={!!canManage}
                canInviteMembers={!!canInviteMembers}
                groupId={groupId}
                groupName={(group as any).name || 'Group'}
                groupCode={(group as any).group_code || ''}
                onRefreshMembers={invalidateGroup}
                currentUserId={user?.id}
                currentUserRole={(group as any).user_role}
                groupSettings={(group as any).settings}
              />
            )}
            {activeTab === 'sessions' && (
              <SessionsTab
                groupId={groupId}
                canManage={!!canManage}
                canDeleteSessions={!!canDeleteSessions}
                canManageQuiz={permissions.canManageQuiz()}
                onCreateSession={handleCreateSession}
                highlightSessionId={highlightSessionId}
              />
            )}
            {activeTab === 'settings' && canManage && (
              <SettingsTab 
                group={group as any} 
              />
            )}
          </div>
        </div>

        {showCreateSession && (
          <CreateSessionModal
            groupId={groupId}
            onClose={() => setShowCreateSession(false)}
            onSuccess={handleCreateSessionSuccess}
            selectedLoopId={selectedLoopId}
          />
        )}
      </div>
    </>
  )
}
