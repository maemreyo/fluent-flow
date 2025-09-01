'use client'

import { Calendar, MessageCircle, Trophy, Users } from 'lucide-react'
import { StudyGroup } from '../types'

interface StatCardsProps {
  group: StudyGroup
}

export function StatCards({ group }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Members</p>
            <p className="text-2xl font-bold text-gray-800">
              {group.member_count}/{group.max_members}
            </p>
          </div>
          <Users className="w-8 h-8 text-indigo-500" />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Quiz Sessions</p>
            <p className="text-2xl font-bold text-gray-800">
              {group.recent_sessions.length}
            </p>
          </div>
          <Calendar className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Language</p>
            <p className="text-2xl font-bold text-gray-800">{group.language}</p>
          </div>
          <MessageCircle className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Level</p>
            <p className="text-2xl font-bold text-gray-800 capitalize">{group.level}</p>
          </div>
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
      </div>
    </div>
  )
}
