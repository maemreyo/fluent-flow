'use client'

import { useEffect, useState } from 'react'
import { HelpCircle, Plus } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { CreateLoopModal } from '@/components/loops/CreateLoopModal'
import { CreateSessionModal } from '@/components/loops/CreateSessionModal'
import { useUserLoops } from '@/hooks/useLoops'
import type { LoopWithStats } from '@/lib/services/loop-management-service'
import { AuthenticatedPage } from '../../components/pages/shared/AuthenticatedPage'
import { PageHeader } from '../../components/pages/shared/PageHeader'
import { SearchableGrid } from '../../components/pages/shared/SearchableGrid'
import { useAuth } from '../../contexts/AuthContext'
import { usePageSearch } from '../../hooks/shared/usePageSearch'
import { PRACTICE_TOUR_STEPS, startTour, useHighlightTour } from '../../hooks/useHighlightTour'
import { useGroupsData } from '../groups/hooks/useGroupsData'
import { LoopCardAdapter } from './components/LoopCardAdapter'
import { LoopsEmptyState } from './components/LoopsEmptyState'

export default function LoopsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const { isAuthenticated } = useAuth()
  const { data: loops = [], isLoading, error } = useUserLoops()
  const { myGroupsQuery } = useGroupsData({ isAuthenticated })
  const userGroups = myGroupsQuery.data || []

  // Handle URL actions
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateModal(true)
    } else if (action === 'practice') {
      // Practice highlighting will be triggered via useHighlightTour
    }
  }, [searchParams])

  // Highlight practice buttons when coming from dashboard
  const shouldShowPracticeTour = searchParams.get('action') === 'practice'
  useHighlightTour({
    steps: PRACTICE_TOUR_STEPS,
    enabled: shouldShowPracticeTour && loops.length > 0,
    storageKey: 'fluent-flow-practice-tour-shown',
    onComplete: () => {
      // Clean up URL after tour
      const url = new URL(window.location.href)
      url.searchParams.delete('action')
      window.history.replaceState({}, '', url.toString())
    }
  })

  // Search functionality
  const {
    searchQuery,
    setSearchQuery,
    filteredData: filteredLoops
  } = usePageSearch<LoopWithStats>({
    data: loops,
    searchFields: ['videoTitle', 'transcript', 'language']
  })

  const handleCreateSession = (loopId: string) => {
    setSelectedLoopId(loopId)
    setShowSessionModal(true)
  }

  const handlePlayLoop = (loop: any) => {
    // Navigate to practice session or open in extension
    const videoUrl = `https://www.youtube.com/watch?v=${loop.videoId}&t=${Math.floor(loop.startTime)}s#fluent-flow-loop=${encodeURIComponent(
      JSON.stringify({
        id: loop.id,
        title: loop.videoTitle,
        startTime: loop.startTime,
        endTime: loop.endTime,
        videoId: loop.videoId,
        segments: loop.segments,
        transcript: loop.transcript
      })
    )}`
    window.open(videoUrl, '_blank')
  }

  const handleCreateLoop = () => {
    setShowCreateModal(true)
  }

  const handleShowTourHelp = () => {
    startTour(PRACTICE_TOUR_STEPS, { storageKey: 'fluent-flow-practice-tour-shown' })
  }

  return (
    <AuthenticatedPage
      title="My Loops"
      subtitle="Sign in to create and manage your personal practice loops from YouTube videos"
    >
      <PageHeader
        title="My Loops"
        subtitle="Create and manage your personal practice loops from YouTube videos"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search loops..."
        actions={[
          { label: 'Create Loop', action: handleCreateLoop, icon: Plus, variant: 'primary' },
          { label: '', action: handleShowTourHelp, icon: HelpCircle, variant: 'secondary' }
        ]}
      />

      <SearchableGrid<LoopWithStats>
        data={filteredLoops}
        isLoading={isLoading}
        error={error}
        CardComponent={LoopCardAdapter}
        EmptyComponent={
          filteredLoops.length === 0 && loops.length === 0 ? LoopsEmptyState : undefined
        }
        emptyProps={{ handleCreateLoop }}
        cardProps={{
          onCreateSession: handleCreateSession,
          onPlayLoop: handlePlayLoop
        }}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateLoopModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}

      {showSessionModal && selectedLoopId && (() => {
        const selectedLoop = loops.find(loop => loop.id === selectedLoopId);
        if (!selectedLoop) return null;

        return (
          <CreateSessionModal
            loopId={selectedLoopId}
            loopTitle={selectedLoop.videoTitle}
            availableGroups={userGroups}
            onClose={() => {
              setShowSessionModal(false)
              setSelectedLoopId(null)
            }}
            onSuccess={() => {
              setShowSessionModal(false)
              setSelectedLoopId(null)
            }}
          />
        )
      })()}
    </AuthenticatedPage>
  )
}
