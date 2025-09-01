'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase/client'

interface JoinGroupModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function JoinGroupModal({ onClose, onSuccess }: JoinGroupModalProps) {
  const [groupCode, setGroupCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { session }
      } = (await supabase?.auth.getSession()) || { data: { session: null } }
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: groupCode })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Successfully joined "${data.group.name}"!`)
        onSuccess()
        onClose()
      } else {
        alert(data.error || 'Failed to join group')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      alert('Failed to join group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-center text-2xl font-bold">Join Study Group</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Group Code</label>
            <input
              type="text"
              required
              value={groupCode}
              onChange={e => setGroupCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center font-mono text-lg tracking-wider transition-all focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="ABC123XY"
              maxLength={8}
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter the 8-character group code shared by the group admin
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || groupCode.length !== 8}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
