import React from 'react'
import { Activity, Clock, Mic, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '../ui/card'
import type { PracticeStatistics } from '../../lib/types/fluent-flow-types'

interface StatisticsCardsProps {
  statistics: PracticeStatistics
  formatTime: (seconds: number) => string
}

export function StatisticsCards({ statistics, formatTime }: StatisticsCardsProps) {
  const statsConfig = [
    {
      icon: Activity,
      title: 'Total Sessions',
      value: statistics.totalSessions,
      color: 'text-blue-500'
    },
    {
      icon: Clock,
      title: 'Practice Time',
      value: formatTime(statistics.totalPracticeTime),
      color: 'text-green-500'
    },
    {
      icon: Mic,
      title: 'Recordings',
      value: statistics.totalRecordings,
      color: 'text-purple-500'
    },
    {
      icon: Target,
      title: 'Avg Session',
      value: formatTime(statistics.averageSessionDuration),
      color: 'text-orange-500'
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <CardDescription className="text-xs">{stat.title}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}