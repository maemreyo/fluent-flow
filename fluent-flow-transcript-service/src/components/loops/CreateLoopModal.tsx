import { useState } from 'react'
import { useCreateLoop } from '@/hooks/useLoops'

interface CreateLoopModalProps {
  groupId: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateLoopModal({ groupId, onClose, onSuccess }: CreateLoopModalProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(60)
  const [isExtracting, setIsExtracting] = useState(false)

  const createMutation = useCreateLoop(groupId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl.trim()) return

    setIsExtracting(true)
    try {
      await createMutation.mutateAsync({
        videoUrl: videoUrl.trim(),
        startTime,
        endTime
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to create loop:', error)
    }
    setIsExtracting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Create Practice Loop</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time (seconds)
              </label>
              <input
                type="number"
                min="0"
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time (seconds)
              </label>
              <input
                type="number"
                min={startTime + 1}
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {createMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">
                {createMutation.error instanceof Error 
                  ? createMutation.error.message 
                  : 'Failed to create loop'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isExtracting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExtracting || !videoUrl.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? 'Creating...' : 'Create Loop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}