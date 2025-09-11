'use client'

import { useState } from 'react'
import { ArrowLeft, CheckCircle, Copy, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StudyGroup } from '../types'

interface GroupHeaderProps {
  group: StudyGroup
  canManage: boolean
  canCreateSessions?: boolean
  onNewSession: () => void
}

export function GroupHeader({
  group,
  canManage,
  canCreateSessions,
  onNewSession
}: GroupHeaderProps) {
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
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/groups')}
          className="rounded-xl p-2 transition-colors hover:bg-white/50"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>

        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                group.is_private ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {group.is_private ? 'Private' : 'Public'}
            </span>
          </div>
          <p className="text-gray-600">{group.description || 'No description'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-4 py-2 backdrop-blur-sm">
          <span className="font-mono text-lg font-bold text-indigo-600">{group.group_code}</span>
          <button
            onClick={copyGroupCode}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100"
            title="Copy group code"
          >
            {copiedCode ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>

        {(canCreateSessions ?? canManage) && (
          <button
            onClick={onNewSession}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-indigo-700 hover:to-purple-700"
          >
            <Plus className="h-5 w-5" />
            New Quiz Session
          </button>
        )}
      </div>
    </div>
  )
}
