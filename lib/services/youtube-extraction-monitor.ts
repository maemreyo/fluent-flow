import type { FluentFlowError } from '../types/fluent-flow-types'

export interface ExtractionHealthReport {
  timestamp: number
  methods: {
    windowObjects: {
      success: boolean
      responseTime: number
      error?: string
      dataQuality: number
    }
    innerTubeAPI: {
      success: boolean
      responseTime: number
      error?: string
      dataQuality: number
    }
  }
  overallHealth: number
  recommendations: string[]
  criticalIssues: string[]
}

export interface ExtractionMetrics {
  successRate: number
  averageResponseTime: number
  failuresByMethod: Record<string, number>
  commonErrors: string[]
  dataIntegrityScore: number
  lastSuccessfulExtraction: number
}

export class YouTubeExtractionMonitor {
  private healthHistory: ExtractionHealthReport[] = []
  private maxHistorySize = 50
  private alertThreshold = 0.5

  public async performHealthCheck(): Promise<ExtractionHealthReport> {
    const [windowObjectsResult, innerTubeResult] = await Promise.allSettled([
      this.testWindowObjectsExtraction(),
      this.testInnerTubeAPIExtraction()
    ])

    const windowObjectsHealth = this.processTestResult(windowObjectsResult, 'Window Objects')
    const innerTubeHealth = this.processTestResult(innerTubeResult, 'InnerTube API')

    const overallHealth = (windowObjectsHealth.success ? 0.6 : 0) + (innerTubeHealth.success ? 0.4 : 0)

    const report: ExtractionHealthReport = {
      timestamp: Date.now(),
      methods: {
        windowObjects: windowObjectsHealth,
        innerTubeAPI: innerTubeHealth
      },
      overallHealth,
      recommendations: this.generateRecommendations(windowObjectsHealth, innerTubeHealth),
      criticalIssues: this.identifyCriticalIssues(windowObjectsHealth, innerTubeHealth)
    }

    this.recordHealthReport(report)
    
    if (overallHealth < this.alertThreshold) {
      this.triggerAlert(report)
    }

    return report
  }

  private async testWindowObjectsExtraction(): Promise<{
    success: boolean
    responseTime: number
    dataQuality: number
    error?: string
  }> {
    const startTime = performance.now()

    try {
      const hasPlayerResponse = typeof window !== 'undefined' && !!(window as any).ytInitialPlayerResponse
      const hasInitialData = typeof window !== 'undefined' && !!(window as any).ytInitialData

      if (!hasPlayerResponse && !hasInitialData) {
        const scripts = document.querySelectorAll('script')
        let foundPlayerResponse = false
        let foundInitialData = false

        for (const script of scripts) {
          if (script.innerHTML.includes('ytInitialPlayerResponse')) {
            foundPlayerResponse = true
          }
          if (script.innerHTML.includes('ytInitialData')) {
            foundInitialData = true
          }
          if (foundPlayerResponse && foundInitialData) break
        }

        if (!foundPlayerResponse && !foundInitialData) {
          throw new Error('No YouTube data objects found')
        }
      }

      const responseTime = performance.now() - startTime
      const dataQuality = this.calculateDataQuality({
        hasPlayerResponse: hasPlayerResponse || false,
        hasInitialData: hasInitialData || false,
        responseTime
      })

      return {
        success: true,
        responseTime,
        dataQuality
      }
    } catch (error) {
      return {
        success: false,
        responseTime: performance.now() - startTime,
        dataQuality: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async testInnerTubeAPIExtraction(): Promise<{
    success: boolean
    responseTime: number
    dataQuality: number
    error?: string
  }> {
    const startTime = performance.now()

    try {
      const videoId = this.extractVideoIdFromCurrentUrl()
      if (!videoId) {
        throw new Error('No video ID available for testing')
      }

      const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.youtube.com/',
          'Origin': 'https://www.youtube.com'
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20250101.00.00'
            }
          },
          videoId
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const data = await response.json()
      const responseTime = performance.now() - startTime

      const dataQuality = this.calculateAPIDataQuality(data, responseTime)

      return {
        success: true,
        responseTime,
        dataQuality
      }
    } catch (error) {
      return {
        success: false,
        responseTime: performance.now() - startTime,
        dataQuality: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private processTestResult(
    result: PromiseSettledResult<{
      success: boolean
      responseTime: number
      dataQuality: number
      error?: string
    }>,
    methodName: string
  ): {
    success: boolean
    responseTime: number
    error?: string
    dataQuality: number
  } {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        success: false,
        responseTime: 0,
        dataQuality: 0,
        error: `${methodName} test failed: ${result.reason}`
      }
    }
  }

  private calculateDataQuality(data: {
    hasPlayerResponse: boolean
    hasInitialData: boolean
    responseTime: number
  }): number {
    let quality = 0

    if (data.hasPlayerResponse) quality += 0.6
    if (data.hasInitialData) quality += 0.3

    if (data.responseTime < 100) quality += 0.1
    else if (data.responseTime > 1000) quality -= 0.2

    return Math.max(0, Math.min(1, quality))
  }

  private calculateAPIDataQuality(data: any, responseTime: number): number {
    let quality = 0

    if (data.videoDetails) quality += 0.4
    if (data.streamingData) quality += 0.3
    if (data.captions) quality += 0.2

    if (responseTime < 500) quality += 0.1
    else if (responseTime > 2000) quality -= 0.2

    return Math.max(0, Math.min(1, quality))
  }

  private generateRecommendations(
    windowObjects: { success: boolean; error?: string },
    innerTube: { success: boolean; error?: string }
  ): string[] {
    const recommendations: string[] = []

    if (!windowObjects.success) {
      recommendations.push('Window objects extraction failing - YouTube may have updated their frontend')
      recommendations.push('Consider updating DOM selectors and window object parsing logic')
    }

    if (!innerTube.success) {
      recommendations.push('InnerTube API extraction failing - API endpoints may have changed')
      recommendations.push('Review request parameters and headers for API calls')
    }

    if (!windowObjects.success && !innerTube.success) {
      recommendations.push('All extraction methods failing - implement YouTube Data API v3 fallback')
      recommendations.push('Enable user notification system for extraction failures')
    }

    return recommendations
  }

  private identifyCriticalIssues(
    windowObjects: { success: boolean; error?: string },
    innerTube: { success: boolean; error?: string }
  ): string[] {
    const issues: string[] = []

    if (!windowObjects.success && !innerTube.success) {
      issues.push('CRITICAL: Complete data extraction failure')
    }

    if (windowObjects.error?.includes('not found') && innerTube.error?.includes('not found')) {
      issues.push('CRITICAL: YouTube structure may have changed significantly')
    }

    if (innerTube.error?.includes('403') || innerTube.error?.includes('429')) {
      issues.push('CRITICAL: Rate limiting or access restrictions detected')
    }

    return issues
  }

  private recordHealthReport(report: ExtractionHealthReport): void {
    this.healthHistory.push(report)

    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize)
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({
          'youtube_extraction_health_history': this.healthHistory.slice(-10)
        })
      }
    } catch (error) {
      console.warn('Failed to persist health history:', error)
    }
  }

  private triggerAlert(report: ExtractionHealthReport): void {
    console.error('YouTube Extraction Health Alert:', {
      overallHealth: report.overallHealth,
      criticalIssues: report.criticalIssues,
      recommendations: report.recommendations
    })

    try {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/assets/icon-48.png',
          title: 'FluentFlow: Extraction Issues',
          message: `YouTube data extraction health is at ${Math.round(report.overallHealth * 100)}%. Check settings.`,
          priority: 2
        })
      }
    } catch (error) {
      console.warn('Failed to send notification:', error)
    }

    if (typeof window !== 'undefined' && (window as any).postMessage) {
      (window as any).postMessage({
        type: 'FLUENT_FLOW_HEALTH_ALERT',
        data: report
      }, '*')
    }
  }

  public getHealthMetrics(): ExtractionMetrics {
    if (this.healthHistory.length === 0) {
      return {
        successRate: 0,
        averageResponseTime: 0,
        failuresByMethod: {},
        commonErrors: [],
        dataIntegrityScore: 0,
        lastSuccessfulExtraction: 0
      }
    }

    const recentReports = this.healthHistory.slice(-20)
    const successfulExtractions = recentReports.filter(r => r.overallHealth > 0.5)
    const successRate = successfulExtractions.length / recentReports.length

    const totalResponseTime = recentReports.reduce((sum, report) => 
      sum + report.methods.windowObjects.responseTime + report.methods.innerTubeAPI.responseTime, 0)
    const averageResponseTime = totalResponseTime / (recentReports.length * 2)

    const failuresByMethod: Record<string, number> = {
      windowObjects: recentReports.filter(r => !r.methods.windowObjects.success).length,
      innerTubeAPI: recentReports.filter(r => !r.methods.innerTubeAPI.success).length
    }

    const allErrors: string[] = []
    recentReports.forEach(report => {
      if (report.methods.windowObjects.error) allErrors.push(report.methods.windowObjects.error)
      if (report.methods.innerTubeAPI.error) allErrors.push(report.methods.innerTubeAPI.error)
    })

    const errorCounts = allErrors.reduce((acc, error) => {
      acc[error] = (acc[error] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const commonErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error)

    const dataIntegrityScore = recentReports.reduce((sum, report) => 
      sum + (report.methods.windowObjects.dataQuality + report.methods.innerTubeAPI.dataQuality) / 2, 0) / recentReports.length

    const lastSuccessfulExtraction = successfulExtractions.length > 0 
      ? successfulExtractions[successfulExtractions.length - 1].timestamp 
      : 0

    return {
      successRate,
      averageResponseTime,
      failuresByMethod,
      commonErrors,
      dataIntegrityScore,
      lastSuccessfulExtraction
    }
  }

  private extractVideoIdFromCurrentUrl(): string | null {
    if (typeof window === 'undefined') return null
    
    const url = window.location.href
    const regex = /[?&]v=([^&#]*)/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  public async startContinuousMonitoring(intervalMinutes = 10): Promise<void> {
    setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, intervalMinutes * 60 * 1000)

    await this.performHealthCheck()
  }

  public createError(code: FluentFlowError['code'], message: string, context?: any): FluentFlowError {
    const error = new Error(message) as FluentFlowError
    error.code = code
    error.context = {
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: Date.now(),
      healthMetrics: this.getHealthMetrics(),
      ...context
    }
    return error
  }
}