'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { UserPlus, Plus } from 'lucide-react'
import { AuthenticatedPage } from '../../components/pages/shared/AuthenticatedPage'
import { PageHeader } from '../../components/pages/shared/PageHeader'
import { SearchableGrid } from '../../components/pages/shared/SearchableGrid'
import { useAuth } from '../../contexts/AuthContext'
import { usePageSearch } from '../../hooks/shared/usePageSearch'
import { CreateGroupModal } from './components/CreateGroupModal'
import { EmptyState } from './components/EmptyState'
import { GroupCardAdapter } from './components/GroupCardAdapter'
import { JoinGroupModal } from './components/JoinGroupModal'
import { useGroupsData } from './hooks/useGroupsData'
import { Group } from './types'

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState<'my-groups' | 'public'>('my-groups')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const searchParams = useSearchParams()

  const { isAuthenticated } = useAuth()

  // Handle URL actions
  useEffect(() => {
    const tab = searchParams.get('tab')
    const action = searchParams.get('action')
    
    if (tab === 'public') {
      setActiveTab('public')
    }
    
    if (action === 'create') {
      setShowCreateModal(true)
    }
  }, [searchParams])

  const {
    getGroupsForTab,
    getLoadingStateForTab,
    getErrorStateForTab,
    prefetchTab,
    invalidateAllGroups
  } = useGroupsData({ isAuthenticated })

  // Get current tab data
  const groups = getGroupsForTab(activeTab)
  const groupsLoading = getLoadingStateForTab(activeTab)
  const { isError, error } = getErrorStateForTab(activeTab)

  // Search functionality
  const { searchQuery, setSearchQuery, filteredData: filteredGroups } = usePageSearch<Group>({
    data: groups,
    searchFields: ['name', 'description', 'language']
  })

  const handleAuthSuccess = () => {
    invalidateAllGroups()
  }

  const handleCreateGroup = () => {
    setShowCreateModal(true)
  }

  const handleJoinGroup = () => {
    setShowJoinModal(true)
  }

  const handleModalSuccess = () => {
    // Invalidate cả 2 tabs vì tạo/join group có thể ảnh hưởng cả 2
    invalidateAllGroups()
  }


  return (
    <AuthenticatedPage
      title="Study Groups"
      subtitle="Sign in to create, join, and manage study groups with your classmates"
      onAuthSuccess={handleAuthSuccess}
    >
      <PageHeader
        title="Study Groups"
        subtitle="Join or create groups to learn together and track progress"
        tabs={[
          { key: 'my-groups', label: 'My Groups', onPrefetch: () => prefetchTab('my-groups') },
          { key: 'public', label: 'Public Groups', onPrefetch: () => prefetchTab('public') }
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'my-groups' | 'public')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search groups..."
        actions={[
          { label: 'Join Group', action: handleJoinGroup, icon: UserPlus, variant: 'secondary' },
          { label: 'Create Group', action: handleCreateGroup, icon: Plus, variant: 'primary' }
        ]}
      />

      <SearchableGrid<Group>
        data={filteredGroups}
        isLoading={groupsLoading}
        error={isError ? error : null}
        CardComponent={GroupCardAdapter}
        EmptyComponent={filteredGroups.length === 0 && groups.length === 0 ? EmptyState : undefined}
        emptyProps={{
          activeTab,
          handleCreateGroup,
          handleJoinGroup
        }}
      />

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
    </AuthenticatedPage>
  )
}
