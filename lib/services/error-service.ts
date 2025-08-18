import { logger } from './logger-service'
import { STORAGE_KEYS } from '../utils/constants'

export interface ErrorReport {
  id: string
  timestamp: number
  message: string
  stack?: string
  context?: string
  source?: 'background' | 'content' | 'popup' | 'sidepanel' | 'options'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
  data?: any
  resolved?: boolean
  reportedToServer?: boolean
}

export interface ErrorServiceConfig {
  enabled: boolean
  reportToServer: boolean
  maxReports: number
  serverEndpoint?: string
  enableAutoReporting: boolean
  criticalErrorThreshold: number
}

export class ErrorService {
  private config: ErrorServiceConfig
  private errorCounts: Map<string, number> = new Map()
  private lastErrorTime: Map<string, number> = new Map()
  private readonly deduplicationWindow = 5000 // 5 seconds

  constructor(config?: Partial<ErrorServiceConfig>) {
    this.config = {
      enabled: true,
      reportToServer: false,
      maxReports: 500,
      serverEndpoint: process.env.PLASMO_PUBLIC_ERROR_ENDPOINT,
      enableAutoReporting: true,
      criticalErrorThreshold: 5,
      ...config
    }

    this.initializeErrorHandling()
  }

  private initializeErrorHandling(): void {
    if (!this.config.enabled) return

    // Global error handler for unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleGlobalError(event.error || new Error(event.message), {
          context: 'Global Error Handler',
          url: event.filename,
          line: event.lineno,
          column: event.colno
        })
      })

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleGlobalError(
          event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
          {
            context: 'Unhandled Promise Rejection'
          }
        )
      })
    }

    this.cleanOldReports()
  }

  private generateErrorId(error: Error, context?: string): string {
    const key = `${error.message}_${error.stack?.split('\n')[1] || ''}_${context || ''}`
    try {
      return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
    } catch {
      // Fallback if btoa fails with invalid characters
      return key.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
    }
  }

  private shouldDeduplicateError(errorId: string): boolean {
    const lastTime = this.lastErrorTime.get(errorId)
    const now = Date.now()
    
    if (lastTime && (now - lastTime) < this.deduplicationWindow) {
      return true
    }
    
    this.lastErrorTime.set(errorId, now)
    return false
  }

  private determineSeverity(error: Error, context?: string): ErrorReport['severity'] {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''
    
    // Critical errors
    if (
      message.includes('security') ||
      message.includes('cors') ||
      message.includes('permission') ||
      context?.toLowerCase().includes('payment') ||
      context?.toLowerCase().includes('auth')
    ) {
      return 'critical'
    }
    
    // High severity errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      stack.includes('service') ||
      error.name === 'TypeError'
    ) {
      return 'high'
    }
    
    // Medium severity errors
    if (
      message.includes('validation') ||
      message.includes('parse') ||
      error.name === 'ValidationError'
    ) {
      return 'medium'
    }
    
    return 'low'
  }

  private detectSource(): ErrorReport['source'] {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        return 'background'
      }
      
      if (typeof window !== 'undefined') {
        const href = window.location?.href || ''
        if (href.includes('popup.html')) return 'popup'
        if (href.includes('sidepanel.html')) return 'sidepanel'
        if (href.includes('options.html')) return 'options'
        return 'content'
      }
      
      return 'background'
    } catch {
      return 'background'
    }
  }

  private async getStoredReports(): Promise<ErrorReport[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.ERROR_REPORTS)
      return result[STORAGE_KEYS.ERROR_REPORTS] || []
    } catch (error) {
      logger.error('Failed to retrieve stored error reports', 'ErrorService', error)
      return []
    }
  }

  private async storeReport(report: ErrorReport): Promise<void> {
    try {
      const existingReports = await this.getStoredReports()
      const updatedReports = [report, ...existingReports].slice(0, this.config.maxReports)
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.ERROR_REPORTS]: updatedReports
      })
    } catch (error) {
      logger.error('Failed to store error report', 'ErrorService', error)
    }
  }

  private async cleanOldReports(): Promise<void> {
    try {
      const reports = await this.getStoredReports()
      const cutoffTime = Date.now() - (14 * 24 * 60 * 60 * 1000) // 14 days
      
      const recentReports = reports.filter(report => report.timestamp > cutoffTime)
      
      if (recentReports.length !== reports.length) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.ERROR_REPORTS]: recentReports
        })
        logger.info(`Cleaned ${reports.length - recentReports.length} old error reports`, 'ErrorService')
      }
    } catch (error) {
      logger.error('Failed to clean old error reports', 'ErrorService', error)
    }
  }

  private async reportToServer(report: ErrorReport): Promise<boolean> {
    if (!this.config.reportToServer || !this.config.serverEndpoint) {
      return false
    }

    try {
      const response = await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...report,
          extensionVersion: chrome.runtime.getManifest().version,
          timestamp: new Date(report.timestamp).toISOString()
        })
      })

      if (response.ok) {
        logger.info('Error report sent to server', 'ErrorService', { reportId: report.id })
        return true
      } else {
        logger.warn('Failed to send error report to server', 'ErrorService', { 
          status: response.status,
          reportId: report.id
        })
        return false
      }
    } catch (error) {
      logger.error('Error sending report to server', 'ErrorService', error)
      return false
    }
  }

  // Public methods
  async reportError(
    error: Error,
    context?: string,
    data?: any,
    severity?: ErrorReport['severity']
  ): Promise<string> {
    if (!this.config.enabled) {
      return ''
    }

    const errorId = this.generateErrorId(error, context)
    
    // Check for deduplication
    if (this.shouldDeduplicateError(errorId)) {
      const count = this.errorCounts.get(errorId) || 0
      this.errorCounts.set(errorId, count + 1)
      return errorId
    }

    this.errorCounts.set(errorId, 1)

    const report: ErrorReport = {
      id: errorId,
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context,
      source: this.detectSource(),
      severity: severity || this.determineSeverity(error, context),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      data,
      resolved: false,
      reportedToServer: false
    }

    // Log the error
    logger.error(
      `Error reported: ${error.message}`,
      context || 'ErrorService',
      { errorId, severity: report.severity, data }
    )

    // Store the report
    await this.storeReport(report)

    // Auto-report to server if enabled
    if (this.config.enableAutoReporting) {
      const success = await this.reportToServer(report)
      if (success) {
        // Update the report to mark as sent
        report.reportedToServer = true
        await this.storeReport(report)
      }
    }

    // Check for critical error threshold
    const errorCount = this.errorCounts.get(errorId) || 0
    if (errorCount >= this.config.criticalErrorThreshold) {
      logger.error(
        `Critical error threshold reached for: ${error.message}`,
        'ErrorService',
        { errorId, count: errorCount }
      )
    }

    return errorId
  }

  async handleGlobalError(error: Error, additionalData?: any): Promise<void> {
    await this.reportError(error, 'Global Error Handler', additionalData, 'high')
  }

  async getErrorReports(options?: {
    severity?: ErrorReport['severity']
    source?: ErrorReport['source']
    since?: number
    resolved?: boolean
    limit?: number
  }): Promise<ErrorReport[]> {
    try {
      let reports = await this.getStoredReports()
      
      // Apply filters
      if (options?.severity) {
        reports = reports.filter(report => report.severity === options.severity)
      }
      
      if (options?.source) {
        reports = reports.filter(report => report.source === options.source)
      }
      
      if (options?.since) {
        reports = reports.filter(report => report.timestamp >= options.since!)
      }
      
      if (options?.resolved !== undefined) {
        reports = reports.filter(report => report.resolved === options.resolved)
      }
      
      // Sort by timestamp (newest first) and limit
      return reports
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, options?.limit || 50)
    } catch (error) {
      logger.error('Failed to get error reports', 'ErrorService', error)
      return []
    }
  }

  async markErrorResolved(errorId: string): Promise<boolean> {
    try {
      const reports = await this.getStoredReports()
      const reportIndex = reports.findIndex(report => report.id === errorId)
      
      if (reportIndex === -1) {
        return false
      }
      
      reports[reportIndex].resolved = true
      
      await chrome.storage.local.set({
        [STORAGE_KEYS.ERROR_REPORTS]: reports
      })
      
      logger.info('Error marked as resolved', 'ErrorService', { errorId })
      return true
    } catch (error) {
      logger.error('Failed to mark error as resolved', 'ErrorService', error)
      return false
    }
  }

  async getErrorStats(): Promise<{
    totalErrors: number
    bySeverity: Record<ErrorReport['severity'], number>
    bySource: Record<string, number>
    resolvedCount: number
    recentErrors: number // last 24 hours
  }> {
    try {
      const reports = await this.getStoredReports()
      const last24Hours = Date.now() - (24 * 60 * 60 * 1000)
      
      const stats = {
        totalErrors: reports.length,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<ErrorReport['severity'], number>,
        bySource: {} as Record<string, number>,
        resolvedCount: 0,
        recentErrors: 0
      }
      
      reports.forEach(report => {
        stats.bySeverity[report.severity]++
        stats.bySource[report.source || 'unknown'] = (stats.bySource[report.source || 'unknown'] || 0) + 1
        
        if (report.resolved) {
          stats.resolvedCount++
        }
        
        if (report.timestamp > last24Hours) {
          stats.recentErrors++
        }
      })
      
      return stats
    } catch (error) {
      logger.error('Failed to get error stats', 'ErrorService', error)
      return {
        totalErrors: 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        bySource: {},
        resolvedCount: 0,
        recentErrors: 0
      }
    }
  }

  async clearReports(): Promise<void> {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.ERROR_REPORTS)
      this.errorCounts.clear()
      this.lastErrorTime.clear()
      logger.info('Error reports cleared', 'ErrorService')
    } catch (error) {
      logger.error('Failed to clear error reports', 'ErrorService', error)
    }
  }

  // Configuration methods
  updateConfig(config: Partial<ErrorServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): ErrorServiceConfig {
    return { ...this.config }
  }
}

// Create singleton instance
export const errorService = new ErrorService()