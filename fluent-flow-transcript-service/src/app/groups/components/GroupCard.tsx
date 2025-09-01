'use client'

import { BarChart3, Calendar, Crown, MessageCircle, Settings, Shield, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StudyGroup } from '../types'

interface GroupCardProps {
  group: StudyGroup
}

export function GroupCard({ group }: GroupCardProps) {
  const router = useRouter()
  const userRole = group.study_group_members?.[0]?.role

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div
      className="group cursor-pointer rounded-3xl border border-white/20 bg-white/90 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      onClick={() => router.push(`/groups/${group.id}`)}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 transition-colors group-hover:text-indigo-600">
              {group.name}
            </h3>
            {userRole && getRoleIcon(userRole)}
          </div>
          <p className="text-sm leading-relaxed text-gray-600">
            {group.description || 'No description'}
          </p>
        </div>
        {!group.is_private && (
          <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Public
          </div>
        )}
      </div>

      {/* Language & Level */}
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {group.language}
        </span>
        <span
          className={`rounded-full border-2 px-3 py-1 text-sm font-medium ${getLevelColor(
            group.level
          )}`}
        >
          {group.level}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>
            {group.member_count}/{group.max_members} members
          </span>
        </div>
        <div className="text-xs">{new Date(group.created_at).toLocaleDateString()}</div>
      </div>

      {/* Action Icons */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MessageCircle className="h-4 w-4" />
            <span>Chat</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Sessions</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4" />
            <span>Stats</span>
          </div>
        </div>
        {(userRole === 'owner' || userRole === 'admin') && (
          <Settings className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-500" />
        )}
      </div>
    </div>
  )
}
