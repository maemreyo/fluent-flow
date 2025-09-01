'use client'

import { use, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AuthPrompt } from '../../../components/auth/AuthPrompt'
import CreateSessionModal from '../../../components/sessions/CreateSessionModal'
import SessionsTab from '../../../components/sessions/SessionsTab'
import { useAuth } from '../../../contexts/AuthContext'
import { GroupHeader } from './components/GroupHeader'
import { MembersTab } from './components/MembersTab'
import { OverviewTab } from './components/OverviewTab'
import { SettingsTab } from './components/SettingsTab'
import { StatCards } from './components/StatCards'
import { GroupTab, TabNavigation } from './components/TabNavigation'
import { useGroupDetail } from './hooks/useGroupDetail'

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const router = useRouter()
  const { groupId } = use(params)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<GroupTab>('overview')
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const { isAuthenticated, isLoading: authLoading } = useAuth()

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

  const handleAuthSuccess = () => {
    setShowAuthPrompt(false)
    invalidateGroup()
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
    router.push('/groups')
  }

  const handleCreateSessionSuccess = () => {
    setShowCreateSession(false)
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
          onAuthSuccess={handleAuthSuccess}
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
            This group doesn't exist or you don't have access to it.
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

  const canManage = (group as any).user_role && ['owner', 'admin'].includes((group as any).user_role)

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
            onNewSession={() => setShowCreateSession(true)}
          />
          <StatCards group={group as any} />
          <TabNavigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            canManage={!!canManage}
          />

          <div className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-lg backdrop-blur-sm">
            {activeTab === 'overview' && (
              <OverviewTab
                sessions={(group as any).recent_sessions || []}
                canManage={!!canManage}
                onNewSession={() => setShowCreateSession(true)}
              />
            )}
            {activeTab === 'members' && (
              <MembersTab
                members={(group as any).members || []}
                memberCount={(group as any).member_count || 0}
                canManage={!!canManage}
              />
            )}
            {activeTab === 'sessions' && (
              <SessionsTab
                groupId={groupId}
                canManage={!!canManage}
                onCreateSession={() => setShowCreateSession(true)}
              />
            )}
            {activeTab === 'settings' && canManage && <SettingsTab />}
          </div>
        </div>

        {showCreateSession && (
          <CreateSessionModal
            groupId={groupId}
            onClose={() => setShowCreateSession(false)}
            onSuccess={handleCreateSessionSuccess}
          />
        )}
      </div>
    </>
  )
}
