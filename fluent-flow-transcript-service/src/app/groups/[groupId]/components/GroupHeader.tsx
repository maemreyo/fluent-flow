'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Copy, Plus } from 'lucide-react'
import { StudyGroup } from '../types'

interface GroupHeaderProps {
  group: StudyGroup
  canManage: boolean
  onNewSession: () => void
}

export function GroupHeader({ group, canManage, onNewSession }: GroupHeaderProps) {
  const router = useRouter()
  const [copiedCode, setCopiedCode] = useState(false)

  const copyGroupCode = () => {
    if (group?.group_code) {
      navigator.clipboard.writeText(group.group_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/groups')}
          className="p-2 hover:bg-white/50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                group.is_private
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {group.is_private ? 'Private' : 'Public'}
            </span>
          </div>
          <p className="text-gray-600">{group.description || 'No description'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
          <span className="font-mono text-lg font-bold text-indigo-600">
            {group.group_code}
          </span>
          <button
            onClick={copyGroupCode}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy group code"
          >
            {copiedCode ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {canManage && (
          <button
            onClick={onNewSession}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Quiz Session
          </button>
        )}
      </div>
    </div>
  )
}
