import { useState } from 'react'
import { BookOpen, Calendar, Clock, X } from 'lucide-react'
import { useLoops } from '@/hooks/useLoops'
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

export default function CreateSessionModal({
  groupId,
  onClose,
  onSuccess
}: CreateSessionModalProps) {
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
            // // Generate questions from the loop transcript
            // const questionResponse = await fetch('/api/questions/generate', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({
            //     transcript: selectedLoopData.transcript,
            //     loop: {
            //       id: selectedLoopData.id,
            //       videoTitle: selectedLoopData.videoTitle,
            //       startTime: selectedLoopData.startTime,
            //       endTime: selectedLoopData.endTime
            //     },
            //     preset: { easy: 3, medium: 3, hard: 2 }, // Default preset
            //     saveToDatabase: true,
            //     groupId,
            //     sessionId: undefined // Will be set after session creation
            //   })
            // })

            // if (questionResponse.ok) {
            // const questionResult = await questionResponse.json()
            // sessionData.shareToken = questionResult.shareToken
            sessionData.loopData = {
              id: selectedLoopData.id,
              videoTitle: selectedLoopData.videoTitle,
              videoUrl: selectedLoopData.videoUrl,
              startTime: selectedLoopData.startTime,
              endTime: selectedLoopData.endTime
            }
            // }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Create Quiz Session</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Session Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="English Listening Practice"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Practice listening skills with TED talks..."
                rows={3}
              />
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-4">
            <label className="mb-3 block text-sm font-semibold text-gray-700">Session Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, sessionType: 'instant' }))}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  formData.sessionType === 'instant'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Start Now</span>
                </div>
                <p className="text-sm text-gray-600">Begin session immediately</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, sessionType: 'scheduled' }))}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  formData.sessionType === 'scheduled'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Schedule</span>
                </div>
                <p className="text-sm text-gray-600">Set a specific time</p>
              </button>
            </div>
          </div>

          {/* Scheduled Time */}
          {formData.sessionType === 'scheduled' && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledAt}
                onChange={e => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
          )}

          {/* Question Import Method */}
          <div className="space-y-4">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
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
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    formData.importMethod === 'loop'
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">Generate from Practice Loop</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Auto-generate questions from existing loop
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* Share Token Input */}
          {formData.importMethod === 'token' && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Share Token *
              </label>
              <input
                type="text"
                required
                value={formData.shareToken}
                onChange={e => setFormData(prev => ({ ...prev, shareToken: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Paste the share token from FluentFlow extension"
              />
              <p className="mt-1 text-xs text-gray-500">
                Get this token by clicking &quot;Share&quot; in the FluentFlow extension
              </p>
            </div>
          )}

          {/* Loop Selection */}
          {formData.importMethod === 'loop' && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Select Practice Loop *
              </label>
              <select
                required
                value={formData.selectedLoop || ''}
                onChange={e => setFormData(prev => ({ ...prev, selectedLoop: e.target.value }))}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="">Choose a practice loop...</option>
                {loops.map((loop: any) => (
                  <option key={loop.id} value={loop.id}>
                    {loop.videoTitle} ({Math.floor((loop.endTime - loop.startTime) / 60)}m{' '}
                    {((loop.endTime - loop.startTime) % 60).toFixed(0)}s)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
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
              onChange={e => setFormData(prev => ({ ...prev, notifyMembers: e.target.checked }))}
              className="h-5 w-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="notifyMembers" className="ml-3 text-sm font-medium text-gray-700">
              Notify group members about this session
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading
                ? 'Creating...'
                : `Create ${formData.sessionType === 'instant' ? 'Now' : 'Session'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
