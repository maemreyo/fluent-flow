'use client'

import Link from 'next/link'
import { 
  Users, 
  RotateCcw, 
  BookOpen, 
  Clock, 
  Target,
  ArrowRight,
  Award,
  Activity
} from 'lucide-react'
import { AuthenticatedPage } from '../../components/pages/shared/AuthenticatedPage'
import { PageHeader } from '../../components/pages/shared/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import { useGroupsData } from '../groups/hooks/useGroupsData'
import { useUserLoops } from '@/hooks/useLoops'

interface DashboardWidget {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  href?: string
}

interface QuickAction {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const { getGroupsForTab } = useGroupsData({ isAuthenticated })
  const { data: loops = [] } = useUserLoops()
  
  const myGroups = getGroupsForTab('my-groups')

  // Dashboard widgets with stats
  const widgets: DashboardWidget[] = [
    {
      title: 'Practice Loops',
      value: loops.length,
      icon: RotateCcw,
      color: 'from-purple-500 to-pink-600',
      href: '/loops'
    },
    {
      title: 'Study Groups',
      value: myGroups.length,
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
      href: '/groups'
    },
    {
      title: 'Total Sessions',
      value: loops.reduce((acc, loop) => acc + (loop.practiceSessionsCount || 0), 0),
      icon: Target,
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Learning Streak',
      value: '7 days',
      icon: Award,
      color: 'from-yellow-500 to-orange-600'
    }
  ]

  // Quick actions for navigation  
  const quickActions: QuickAction[] = [
    {
      title: 'Practice Session',
      description: 'Start practicing with your existing loops',
      icon: Target,
      href: '/loops?action=practice',
      color: 'from-orange-500 to-red-600'
    },
    {
      title: 'Create Practice Loop',
      description: 'Turn YouTube videos into interactive lessons',
      icon: RotateCcw,
      href: '/loops?action=create',
      color: 'from-purple-500 to-pink-600'
    },
    {
      title: 'Create Study Group',
      description: 'Start learning with friends and classmates',
      icon: Users,
      href: '/groups?action=create',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'Join Public Group',
      description: 'Find and join existing study communities',
      icon: BookOpen,
      href: '/groups?tab=public',
      color: 'from-green-500 to-emerald-600'
    }
  ]

  const recentActivities = [
    {
      type: 'loop_created',
      title: 'Created new loop: "English Grammar Basics"',
      time: '2 hours ago',
      icon: RotateCcw
    },
    {
      type: 'group_joined',
      title: 'Joined "Advanced Language Learning"',
      time: '1 day ago', 
      icon: Users
    },
    {
      type: 'session_completed',
      title: 'Completed practice session',
      time: '2 days ago',
      icon: Target
    }
  ]

  return (
    <AuthenticatedPage
      title="Dashboard"
      subtitle="Welcome to your language learning journey"
    >
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.user_metadata?.username || user?.email?.split('@')[0] || 'learner'}! Ready to continue your language learning journey?`}
      />

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {widgets.map((widget, index) => {
          const Icon = widget.icon
          const content = (
            <div className="group relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className={`absolute inset-0 bg-gradient-to-br ${widget.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${widget.color} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {widget.href && (
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {widget.value}
                </div>
                <div className="text-sm text-gray-600">
                  {widget.title}
                </div>
              </div>
            </div>
          )

          return widget.href ? (
            <Link key={index} href={widget.href}>
              {content}
            </Link>
          ) : (
            <div key={index}>
              {content}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="group relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} shadow-lg`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="rounded-2xl bg-white/90 p-6 shadow-lg backdrop-blur-sm">
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                      <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Learning Tips */}
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 border border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-indigo-900">Learning Tip</h3>
            </div>
            <p className="text-sm text-indigo-700">
              Consistency is key! Try to practice at least 15 minutes daily to maintain your learning momentum and improve retention.
            </p>
          </div>
        </div>
      </div>
    </AuthenticatedPage>
  )
}