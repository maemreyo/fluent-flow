'use client'

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  Plus
} from 'lucide-react'
import { QuizSession } from '../types'

interface OverviewTabProps {
  sessions: QuizSession[]
  canManage: boolean
  onNewSession: () => void
}

export function OverviewTab({
  sessions,
  canManage,
  onNewSession
}: OverviewTabProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'active':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Activity</h2>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No quiz sessions yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create the first quiz session to get started!
          </p>
          {canManage && (
            <button
              onClick={onNewSession}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Create Quiz Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
            >
              <div className="flex items-center gap-4">
                {getStatusIcon(session.status)}
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {session.quiz_title || session.video_title || 'Quiz Session'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {new Date(session.scheduled_at).toLocaleString()} •{
                      ' '}
                    {session.result_count} participants
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                View Results
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
