'use client'

import { useState } from 'react'
import { PagesNavigation } from '@/components/navigation/PagesNavigation'
import { AuthPrompt } from '../../components/auth/AuthPrompt'
import { useAuth } from '../../contexts/AuthContext'
import { CreateGroupModal } from './components/CreateGroupModal'
import { EmptyState } from './components/EmptyState'
import { GroupsGrid } from './components/GroupsGrid'
import { GroupsHeader } from './components/GroupsHeader'
import { GroupsLoadingSkeleton } from './components/GroupsLoadingSkeleton'
import { JoinGroupModal } from './components/JoinGroupModal'
import { useGroupsData } from './hooks/useGroupsData'

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState<'my-groups' | 'public'>('my-groups')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth()

  const {
    getGroupsForTab,
    getLoadingStateForTab,
    getErrorStateForTab,
    prefetchTab,
    invalidateTab,
    invalidateAllGroups
  } = useGroupsData({ isAuthenticated })

  // Get current tab data
  const groups = getGroupsForTab(activeTab)
  const groupsLoading = getLoadingStateForTab(activeTab)
  const { isError, error } = getErrorStateForTab(activeTab)

  const filteredGroups = groups.filter(
    group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.language.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAuthSuccess = () => {
    setShowAuthPrompt(false)
    invalidateAllGroups()
  }

  const handleCloseAuthPrompt = () => {
    setShowAuthPrompt(false)
  }

  const handleCreateGroup = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    setShowCreateModal(true)
  }

  const handleJoinGroup = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }
    setShowJoinModal(true)
  }

  const handleModalSuccess = () => {
    // Invalidate cả 2 tabs vì tạo/join group có thể ảnh hưởng cả 2
    invalidateAllGroups()
  }

  const handlePrefetchTab = (tab: 'my-groups' | 'public') => {
    // Chỉ prefetch nếu không phải tab hiện tại
    if (tab !== activeTab) {
      prefetchTab(tab)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AuthPrompt
          onClose={handleCloseAuthPrompt}
          onAuthSuccess={handleAuthSuccess}
          title="Join Study Groups!"
          subtitle="Sign in to create, join, and manage study groups with your classmates"
        />
      </div>
    )
  }

  return (
    <>
      <PagesNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-20">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="animate-blob absolute left-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 mix-blend-multiply blur-xl filter"></div>
          <div className="animate-blob animation-delay-2000 absolute right-10 top-10 h-72 w-72 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 mix-blend-multiply blur-xl filter"></div>
          <div className="animate-blob animation-delay-4000 absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-gradient-to-r from-pink-400/20 to-orange-400/20 mix-blend-multiply blur-xl filter"></div>
        </div>

        <div className="container relative z-10 mx-auto max-w-7xl px-6 py-8">
          <GroupsHeader
            user={user}
            isAuthenticated={isAuthenticated}
            signOut={signOut}
            handleJoinGroup={handleJoinGroup}
            handleCreateGroup={handleCreateGroup}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPrefetchTab={handlePrefetchTab}
          />

          {groupsLoading ? (
            <GroupsLoadingSkeleton />
          ) : isError ? (
            <div className="text-center text-red-500">Error fetching groups: {error?.message}</div>
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              activeTab={activeTab}
              handleCreateGroup={handleCreateGroup}
              handleJoinGroup={handleJoinGroup}
            />
          ) : (
            <GroupsGrid groups={filteredGroups} />
          )}
        </div>

        {showCreateModal && (
          <CreateGroupModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              handleModalSuccess()
            }}
          />
        )}

        {showJoinModal && (
          <JoinGroupModal
            onClose={() => setShowJoinModal(false)}
            onSuccess={() => {
              setShowJoinModal(false)
              handleModalSuccess()
            }}
          />
        )}
      </div>
    </>
  )
}
