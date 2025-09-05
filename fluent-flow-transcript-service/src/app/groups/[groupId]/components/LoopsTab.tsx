'use client'

import { useState } from 'react'
import { Plus, BookOpen } from 'lucide-react'
import { useLoops, useDeleteLoop } from '@/hooks/useLoops'
import { CreateLoopModal } from '@/components/loops/CreateLoopModal'
import { LoopCard } from '@/components/loops/LoopCard'

interface LoopsTabProps {
  groupId: string
  canManage: boolean
  onCreateSession?: () => void
}

export function LoopsTab({ groupId, canManage, onCreateSession }: LoopsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: loops = [], isLoading, error } = useLoops(groupId)
  const deleteMutation = useDeleteLoop(groupId)

  const handleDeleteLoop = async (loopId: string) => {
    if (window.confirm('Are you sure you want to delete this loop? This action cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync(loopId)
      } catch (error) {
        console.error('Failed to delete loop:', error)
      }
    }
  }

  const handlePracticeLoop = async (loop: any) => {
    try {
      console.log('Starting practice session with segments for loop:', loop.id)
      
      // Check if loop has segments and transcript
      if (!loop.segments?.length || !loop.transcript?.trim()) {
        console.warn('No segments or transcript available for loop:', loop.id)
        // Still proceed with original behavior
        if (onCreateSession) {
          onCreateSession()
        }
        return
      }

      console.log('Sending segments to question generation API:', {
        segmentsCount: loop.segments.length,
        transcriptLength: loop.transcript.length
      })

      // Call the questions generation API with segments
      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: loop.transcript,
          loop: {
            id: loop.id,
            videoTitle: loop.videoTitle,
            startTime: loop.startTime,
            endTime: loop.endTime
          },
          segments: loop.segments, // Use segments directly from loop
          preset: { easy: 3, medium: 2, hard: 1 }, // Default preset for now
          saveToDatabase: true,
          groupId: groupId
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate questions')
      }

      console.log('Questions generated successfully:', result.data.metadata)

      // Navigate to quiz screen or trigger original behavior
      if (onCreateSession) {
        onCreateSession()
      }
      
    } catch (error) {
      console.error('Failed to start practice session:', error)
      // Fallback to original behavior
      if (onCreateSession) {
        onCreateSession()
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Practice Loops</h2>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-100 p-6 h-48"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Loops</h3>
        <p className="text-red-600">Failed to load practice loops. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Practice Loops</h2>
          <p className="text-gray-600 mt-1">
            YouTube video segments with transcripts for focused practice
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Loop
          </button>
        )}
      </div>

      {loops.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Practice Loops</h3>
          <p className="text-gray-600 mb-6">
            Create your first loop from a YouTube video to start practicing with AI-generated questions.
          </p>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Loop
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loops.map((loop) => (
            <LoopCard
              key={loop.id}
              loop={loop}
              canManage={canManage}
              onDelete={() => handleDeleteLoop(loop.id)}
              onCreateSession={() => handlePracticeLoop(loop)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateLoopModal
          groupId={groupId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}