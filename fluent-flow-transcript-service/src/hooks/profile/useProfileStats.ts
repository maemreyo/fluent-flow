import { useMemo } from 'react'
import { Award, Target, RotateCcw, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUserLoops } from '@/hooks/useLoops'
import { useGroupsData } from '../../app/groups/hooks/useGroupsData'

export interface ProfileStat {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export function useProfileStats() {
  const { isAuthenticated } = useAuth()
  const { data: loops = [] } = useUserLoops()
  const { getGroupsForTab } = useGroupsData({ isAuthenticated })
  const myGroups = getGroupsForTab('my-groups')

  const stats: ProfileStat[] = useMemo(() => [
    {
      label: 'Practice Loops',
      value: loops.length,
      icon: RotateCcw,
      color: 'from-purple-500 to-pink-600'
    },
    {
      label: 'Study Groups',
      value: myGroups.length,
      icon: Users,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      label: 'Total Sessions',
      value: loops.reduce((acc, loop) => acc + (loop.practiceSessionsCount || 0), 0),
      icon: Target,
      color: 'from-green-500 to-emerald-600'
    },
    {
      label: 'Achievements',
      value: '?', // Coming soon
      icon: Award,
      color: 'from-yellow-500 to-orange-600'
    }
  ], [loops, myGroups])

  return { stats }
}