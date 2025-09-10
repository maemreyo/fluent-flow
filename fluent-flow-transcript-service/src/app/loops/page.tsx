'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { useGroupsData } from '@/app/groups/hooks/useGroupsData'
import { CreateLoopModal } from '@/components/loops/CreateLoopModal'
import { CreateSessionModal } from '@/components/loops/CreateSessionModal'
import { LoopCard } from '@/components/loops/LoopCard'
import { useDeleteUserLoop, useUserLoops } from '@/hooks/useLoops'
import { supabase } from '@/lib/supabase/client'

export default function LoopsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session }
      } = await supabase!.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
  }, [])

  const { data: loops = [], isLoading, error } = useUserLoops()
  const { myGroupsQuery } = useGroupsData({ isAuthenticated })
  const userGroups = myGroupsQuery.data || []
  const deleteMutation = useDeleteUserLoop()

  const handleDeleteLoop = async (loopId: string) => {
    if (
      window.confirm('Are you sure you want to delete this loop? This action cannot be undone.')
    ) {
      try {
        await deleteMutation.mutateAsync(loopId)
      } catch (error) {
        console.error('Failed to delete loop:', error)
      }
    }
  }

  const handleCreateSession = (loopId: string) => {
    setSelectedLoopId(loopId)
    setShowSessionModal(true)
  }

  const handleOpenInExtension = async (loop: any) => {
    try {
      console.log('🚀 Opening loop in extension:', loop.id, loop.videoTitle)

      // Construct the YouTube URL with the video, time, and loop metadata as hash parameters
      // The extension can read these parameters to auto-load the loop
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

      // Open in new tab - the extension will detect the hash and auto-apply the loop
      window.open(videoUrl, '_blank')

      console.log(
        '✅ Loop opened in YouTube. The extension will automatically apply the loop if installed.'
      )
    } catch (error) {
      console.error('Failed to open loop in extension:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">My Loops</h1>
            <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 p-6"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-red-50 p-6 text-center">
            <h3 className="mb-2 text-lg font-medium text-red-800">Error Loading Loops</h3>
            <p className="text-red-600">Failed to load your loops. Please try again.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Loops</h1>
            <p className="mt-1 text-gray-600">
              YouTube video segments with transcripts for focused practice
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Loop
          </button>
        </div>

        {loops.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto mb-6 h-20 w-20 text-gray-300" />
            <h3 className="mb-3 text-xl font-medium text-gray-900">No Practice Loops</h3>
            <p className="mx-auto mb-8 max-w-md text-gray-600">
              Create your first loop from a YouTube video to start practicing with AI-generated
              questions. You can then use these loops to create group sessions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              Create Your First Loop
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loops.map(loop => (
              <LoopCard
                key={loop.id}
                loop={loop}
                canManage={true}
                onDelete={() => handleDeleteLoop(loop.id)}
                onCreateSession={() => handleCreateSession(loop.id)}
                onOpenInExtension={() => handleOpenInExtension(loop)}
              />
            ))}
          </div>
        )}

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
    </div>
  )
}
