import { useLoops } from '@/hooks/useLoops'
import { BookOpen, Calendar, Clock, X } from 'lucide-react'
import { useState } from 'react'
import { useGroupSessions } from '../../hooks/useGroupSessions'

interface CreateSessionModalProps {
  groupId: string
  onClose: () => void
  onSuccess?: () => void
}

interface SessionFormData {
  title: string
  description: string
  scheduledAt: string
  sessionType: 'instant' | 'scheduled'
  notifyMembers: boolean
  shareToken: string
  importMethod: 'token' | 'manual' | 'loop' | 'none'
  selectedLoop?: string
}

export default function CreateSessionModal({ groupId, onClose, onSuccess }: CreateSessionModalProps) {
  const { createSession } = useGroupSessions(groupId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available loops for this group
  const { data: loops = [] } = useLoops(groupId)
  
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    scheduledAt: '',
    sessionType: 'instant',
    notifyMembers: true,
    shareToken: '',
    importMethod: 'none',
    selectedLoop: undefined
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let sessionData: any = {
        title: formData.title,
        description: formData.description,
        scheduledAt: formData.sessionType === 'scheduled' ? formData.scheduledAt : undefined,
        shareToken: formData.importMethod === 'token' ? formData.shareToken : undefined,
        notifyMembers: formData.notifyMembers,
        sessionType: formData.sessionType
      }

      // If using a loop, generate questions from it
      if (formData.importMethod === 'loop' && formData.selectedLoop) {
        const selectedLoopData = loops.find((loop: any) => loop.id === formData.selectedLoop)
        if (selectedLoopData) {
          try {
            // Generate questions from the loop transcript
            const questionResponse = await fetch('/api/questions/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcript: selectedLoopData.transcript,
                loop: {
                  id: selectedLoopData.id,
                  videoTitle: selectedLoopData.videoTitle,
                  startTime: selectedLoopData.startTime,
                  endTime: selectedLoopData.endTime
                },
                preset: { easy: 3, medium: 3, hard: 2 }, // Default preset
                saveToDatabase: true,
                groupId,
                sessionId: undefined // Will be set after session creation
              })
            })

            if (questionResponse.ok) {
              const questionResult = await questionResponse.json()
              sessionData.shareToken = questionResult.shareToken
              sessionData.loopData = {
                id: selectedLoopData.id,
                videoTitle: selectedLoopData.videoTitle,
                videoUrl: selectedLoopData.videoUrl,
                startTime: selectedLoopData.startTime,
                endTime: selectedLoopData.endTime
              }
            }
          } catch (questionError) {
            console.error('Failed to generate questions from loop:', questionError)
            // Continue with session creation without questions
          }
        }
      }

      await createSession(sessionData)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Create Quiz Session</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
                placeholder="English Listening Practice"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
                placeholder="Practice listening skills with TED talks..."
                rows={3}
              />
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Session Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, sessionType: 'instant' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.sessionType === 'instant'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Start Now</span>
                </div>
                <p className="text-sm text-gray-600">Begin session immediately</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, sessionType: 'scheduled' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.sessionType === 'scheduled'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">Schedule</span>
                </div>
                <p className="text-sm text-gray-600">Set a specific time</p>
              </button>
            </div>
          </div>

          {/* Scheduled Time */}
          {formData.sessionType === 'scheduled' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledAt}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              />
            </div>
          )}

          {/* Question Import Method */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Questions Source
            </label>
            <div className="space-y-3">
              {/* <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, importMethod: 'none' }))}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  formData.importMethod === 'none'
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Create Empty Session</span>
                </div>
                <p className="text-sm text-gray-600">Add questions later or use for discussion</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, importMethod: 'token' }))}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  formData.importMethod === 'token'
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Link className="w-4 h-4" />
                  <span className="font-medium">Import from Extension</span>
                </div>
                <p className="text-sm text-gray-600">Use share token from FluentFlow extension</p>
              </button> */}

              {loops.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, importMethod: 'loop' }))}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.importMethod === 'loop'
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium">Generate from Practice Loop</span>
                  </div>
                  <p className="text-sm text-gray-600">Auto-generate questions from existing loop</p>
                </button>
              )}
            </div>
          </div>

          {/* Share Token Input */}
          {formData.importMethod === 'token' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Share Token *
              </label>
              <input
                type="text"
                required
                value={formData.shareToken}
                onChange={(e) => setFormData(prev => ({ ...prev, shareToken: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
                placeholder="Paste the share token from FluentFlow extension"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this token by clicking &quot;Share&quot; in the FluentFlow extension
              </p>
            </div>
          )}

          {/* Loop Selection */}
          {formData.importMethod === 'loop' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Practice Loop *
              </label>
              <select
                required
                value={formData.selectedLoop || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, selectedLoop: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              >
                <option value="">Choose a practice loop...</option>
                {loops.map((loop: any) => (
                  <option key={loop.id} value={loop.id}>
                    {loop.videoTitle} ({Math.floor((loop.endTime - loop.startTime) / 60)}m {((loop.endTime - loop.startTime) % 60).toFixed(0)}s)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Questions will be automatically generated from the selected loop transcript
              </p>
            </div>
          )}

          {/* Notifications */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyMembers"
              checked={formData.notifyMembers}
              onChange={(e) => setFormData(prev => ({ ...prev, notifyMembers: e.target.checked }))}
              className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="notifyMembers" className="ml-3 text-sm font-medium text-gray-700">
              Notify group members about this session
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating...' : `Create ${formData.sessionType === 'instant' ? 'Now' : 'Session'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}