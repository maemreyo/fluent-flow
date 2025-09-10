'use client'

import { useState } from 'react'
import { CreateLoopModal } from '@/components/loops/CreateLoopModal'
import { CreateSessionModal } from '@/components/loops/CreateSessionModal'
import { PagesNavigation } from '@/components/navigation/PagesNavigation'
import { useGroupsData } from '../groups/hooks/useGroupsData'
import { useUserLoops } from '@/hooks/useLoops'
import { AuthPrompt } from '../../components/auth/AuthPrompt'
import { useAuth } from '../../contexts/AuthContext'
import { LoopsEmptyState } from './components/LoopsEmptyState'
import { LoopsGrid } from './components/LoopsGrid'
import { LoopsHeader } from './components/LoopsHeader'
import { LoopsLoadingSkeleton } from './components/LoopsLoadingSkeleton'

export default function LoopsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth()
  const { data: loops = [], isLoading, error } = useUserLoops()
  const { myGroupsQuery } = useGroupsData({ isAuthenticated })
  const userGroups = myGroupsQuery.data || []
  const filteredLoops = loops.filter(
    loop =>
      loop.videoTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.language?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const handleCloseAuthPrompt = () => {
    // Handle auth prompt close
  }

  const handleAuthSuccess = () => {
    // Handle auth success
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
          title="Access Your Loops"
          subtitle="Sign in to create and manage your personal practice loops from YouTube videos"
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
          <LoopsHeader
            user={user}
            isAuthenticated={isAuthenticated}
            signOut={signOut}
            handleCreateLoop={() => setShowCreateModal(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {isLoading ? (
            <LoopsLoadingSkeleton />
          ) : error ? (
            <div className="text-center text-red-500">Error fetching loops: {error?.message}</div>
          ) : filteredLoops.length === 0 ? (
            <LoopsEmptyState handleCreateLoop={() => setShowCreateModal(true)} />
          ) : (
            <LoopsGrid
              loops={filteredLoops}
              onCreateSession={handleCreateSession}
              onPlayLoop={handlePlayLoop}
            />
          )}
        </div>

        {/* Modals */}
        {showCreateModal && (
          <CreateLoopModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => setShowCreateModal(false)}
          />
        )}

        {showSessionModal && selectedLoopId && (
          <CreateSessionModal
            loopId={selectedLoopId}
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
        )}
      </div>
    </>
  )
}
