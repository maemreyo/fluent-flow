/**
 * Utility functions for calculating practice analytics
 */

export interface AnalyticsData {
  weeklyTrend: Array<{
    date: Date
    sessions: number
    practiceTime: number
    recordings: number
  }>
  monthlyTrend: Array<{
    weekStart: Date
    sessions: number
    practiceTime: number
    recordings: number
  }>
  dailyAverages: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
  }
  practiceStreak: number
  mostActiveDay: number | null
  improvementRate: number
}

/**
 * Calculate comprehensive analytics from session data
 */
export function calculateAnalytics(allSessions: any[]): AnalyticsData {
  if (!allSessions || allSessions.length === 0) {
    return {
      weeklyTrend: [],
      monthlyTrend: [],
      dailyAverages: { thisWeek: 0, lastWeek: 0, thisMonth: 0 },
      practiceStreak: 0,
      mostActiveDay: null,
      improvementRate: 0
    }
  }

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Weekly trend (last 7 days)
  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const daySessions = allSessions.filter(
      session => session.createdAt >= dayStart && session.createdAt < dayEnd
    )

    return {
      date: dayStart,
      sessions: daySessions.length,
      practiceTime: daySessions.reduce((acc, session) => acc + session.totalPracticeTime, 0),
      recordings: daySessions.reduce((acc, session) => acc + session.recordings.length, 0)
    }
  }).reverse()

  // Monthly trend (last 30 days by week)
  const monthlyTrend = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const weekSessions = allSessions.filter(
      session => session.createdAt >= weekStart && session.createdAt < weekEnd
    )

    return {
      weekStart,
      sessions: weekSessions.length,
      practiceTime: weekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0),
      recordings: weekSessions.reduce((acc, session) => acc + session.recordings.length, 0)
    }
  }).reverse()

  // Daily averages
  const thisWeekSessions = allSessions.filter(session => session.createdAt >= oneWeekAgo)
  const lastWeekSessions = allSessions.filter(
    session => session.createdAt >= twoWeeksAgo && session.createdAt < oneWeekAgo
  )
  const thisMonthSessions = allSessions.filter(session => session.createdAt >= oneMonthAgo)

  const dailyAverages = {
    thisWeek: thisWeekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0) / 7,
    lastWeek: lastWeekSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0) / 7,
    thisMonth: thisMonthSessions.reduce((acc, session) => acc + session.totalPracticeTime, 0) / 30
  }

  // Practice streak (consecutive days with sessions)
  let practiceStreak = 0
  for (let i = 0; i < 365; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const hasSession = allSessions.some(
      session => session.createdAt >= dayStart && session.createdAt < dayEnd
    )

    if (hasSession) {
      practiceStreak++
    } else {
      break
    }
  }

  // Most active day of week
  const dayActivity = Array.from({ length: 7 }, () => 0)
  allSessions.forEach(session => {
    const dayOfWeek = session.createdAt.getDay()
    dayActivity[dayOfWeek] += session.totalPracticeTime
  })
  const mostActiveDay = dayActivity.indexOf(Math.max(...dayActivity))

  // Improvement rate (this week vs last week)
  const thisWeekTime = thisWeekSessions.reduce(
    (acc, session) => acc + session.totalPracticeTime,
    0
  )
  const lastWeekTime = lastWeekSessions.reduce(
    (acc, session) => acc + session.totalPracticeTime,
    0
  )
  const improvementRate =
    lastWeekTime > 0 ? ((thisWeekTime - lastWeekTime) / lastWeekTime) * 100 : 0

  return {
    weeklyTrend,
    monthlyTrend,
    dailyAverages,
    practiceStreak,
    mostActiveDay,
    improvementRate
  }
}

/**
 * Compute real statistics from session data
 */
export function computeRealStatistics(allSessions: any[], fallbackStatistics: any) {
  if (!allSessions || allSessions.length === 0) {
    return fallbackStatistics // Return default statistics if no sessions
  }

  const totalSessions = allSessions.length
  const totalRecordings = allSessions.reduce((acc, session) => acc + session.recordings.length, 0)
  const totalPracticeTime = allSessions.reduce(
    (acc, session) => acc + session.totalPracticeTime,
    0
  )
  const avgSessionTime = totalSessions > 0 ? totalPracticeTime / totalSessions : 0

  return {
    ...fallbackStatistics,
    totalSessions,
    totalRecordings,
    totalPracticeTime,
    avgSessionTime
  }
}