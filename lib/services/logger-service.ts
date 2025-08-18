import type { LogLevel } from '../types'
import { STORAGE_KEYS } from '../utils/constants'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  context?: string
  data?: any
  source?: 'background' | 'content' | 'popup' | 'sidepanel' | 'options'
  userId?: string
  sessionId?: string
}

export interface LoggerConfig {
  enabled: boolean
  level: LogLevel
  maxEntries: number
  persistToDisk: boolean
  includeStackTrace: boolean
  enableConsole: boolean
}

export class LoggerService {
  private config: LoggerConfig
  private sessionId: string
  private logBuffer: LogEntry[] = []
  private readonly maxBufferSize = 100

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enabled: true,
      level: (process.env.PLASMO_PUBLIC_LOG_LEVEL as LogLevel) || 'info',
      maxEntries: 1000,
      persistToDisk: true,
      includeStackTrace: false,
      enableConsole: true,
      ...config
    }
    
    this.sessionId = this.generateSessionId()
    this.initializeLogger()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeLogger(): Promise<void> {
    try {
      await this.cleanOldLogs()
    } catch (error) {
      console.error('Logger initialization failed:', error)
    }
  }

  private getLogLevelPriority(level: LogLevel): number {
    const priorities = { debug: 0, info: 1, warn: 2, error: 3 }
    return priorities[level] || 0
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false
    return this.getLogLevelPriority(level) >= this.getLogLevelPriority(this.config.level)
  }

  private async persistLogs(): Promise<void> {
    if (!this.config.persistToDisk || this.logBuffer.length === 0) return

    try {
      const existingLogs = await this.getStoredLogs()
      const allLogs = [...existingLogs, ...this.logBuffer]
      
      // Keep only the most recent entries
      const recentLogs = allLogs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.config.maxEntries)

      await chrome.storage.local.set({
        [STORAGE_KEYS.LOGS]: recentLogs
      })

      this.logBuffer = []
    } catch (error) {
      console.error('Failed to persist logs:', error)
    }
  }

  private async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.LOGS)
      return result[STORAGE_KEYS.LOGS] || []
    } catch (error) {
      console.error('Failed to retrieve stored logs:', error)
      return []
    }
  }

  private async cleanOldLogs(): Promise<void> {
    try {
      const logs = await this.getStoredLogs()
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days
      
      const recentLogs = logs.filter(log => log.timestamp > cutoffTime)
      
      if (recentLogs.length !== logs.length) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.LOGS]: recentLogs
        })
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error)
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): LogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      context,
      data,
      source: this.detectSource(),
      sessionId: this.sessionId
    }
  }

  private detectSource(): LogEntry['source'] {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        if (chrome.runtime.getManifest) {
          return 'background'
        }
      }
      
      if (typeof window !== 'undefined') {
        if (window.location?.href?.includes('popup.html')) return 'popup'
        if (window.location?.href?.includes('sidepanel.html')) return 'sidepanel'
        if (window.location?.href?.includes('options.html')) return 'options'
        return 'content'
      }
      
      return 'background'
    } catch {
      return 'background'
    }
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const timestamp = new Date(entry.timestamp).toISOString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`
    
    const logData = entry.data ? [entry.message, entry.data] : [entry.message]
    
    switch (entry.level) {
      case 'debug':
        console.debug(prefix, ...logData)
        break
      case 'info':
        console.info(prefix, ...logData)
        break
      case 'warn':
        console.warn(prefix, ...logData)
        break
      case 'error':
        console.error(prefix, ...logData)
        if (this.config.includeStackTrace) {
          console.trace()
        }
        break
    }
  }

  // Public logging methods
  debug(message: string, context?: string, data?: any): void {
    this.log('debug', message, context, data)
  }

  info(message: string, context?: string, data?: any): void {
    this.log('info', message, context, data)
  }

  warn(message: string, context?: string, data?: any): void {
    this.log('warn', message, context, data)
  }

  error(message: string, context?: string, data?: any): void {
    this.log('error', message, context, data)
  }

  private async log(level: LogLevel, message: string, context?: string, data?: any): Promise<void> {
    if (!this.shouldLog(level)) return

    const entry = this.createLogEntry(level, message, context, data)
    
    // Output to console immediately
    this.outputToConsole(entry)
    
    // Add to buffer for persistence
    this.logBuffer.push(entry)
    
    // Persist when buffer is full or for error level
    if (this.logBuffer.length >= this.maxBufferSize || level === 'error') {
      await this.persistLogs()
    }
  }

  // Utility methods
  async flush(): Promise<void> {
    await this.persistLogs()
  }

  async getLogs(options?: {
    level?: LogLevel
    since?: number
    limit?: number
    source?: LogEntry['source']
  }): Promise<LogEntry[]> {
    try {
      await this.flush() // Ensure current buffer is persisted
      
      let logs = await this.getStoredLogs()
      
      // Apply filters
      if (options?.level) {
        const minPriority = this.getLogLevelPriority(options.level)
        logs = logs.filter(log => this.getLogLevelPriority(log.level) >= minPriority)
      }
      
      if (options?.since) {
        logs = logs.filter(log => log.timestamp >= options.since!)
      }
      
      if (options?.source) {
        logs = logs.filter(log => log.source === options.source)
      }
      
      // Sort by timestamp (newest first) and limit
      logs = logs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, options?.limit || 100)
      
      return logs
    } catch (error) {
      console.error('Failed to retrieve logs:', error)
      return []
    }
  }

  async clearLogs(): Promise<void> {
    try {
      this.logBuffer = []
      await chrome.storage.local.remove(STORAGE_KEYS.LOGS)
      this.info('Logs cleared', 'LoggerService')
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  async getLogStats(): Promise<{
    totalEntries: number
    byLevel: Record<LogLevel, number>
    bySource: Record<string, number>
    oldestTimestamp: number
    newestTimestamp: number
  }> {
    try {
      const logs = await this.getStoredLogs()
      
      const stats = {
        totalEntries: logs.length,
        byLevel: { debug: 0, info: 0, warn: 0, error: 0 } as Record<LogLevel, number>,
        bySource: {} as Record<string, number>,
        oldestTimestamp: logs.length > 0 ? Math.min(...logs.map(l => l.timestamp)) : 0,
        newestTimestamp: logs.length > 0 ? Math.max(...logs.map(l => l.timestamp)) : 0
      }
      
      logs.forEach(log => {
        stats.byLevel[log.level]++
        stats.bySource[log.source || 'unknown'] = (stats.bySource[log.source || 'unknown'] || 0) + 1
      })
      
      return stats
    } catch (error) {
      console.error('Failed to get log stats:', error)
      return {
        totalEntries: 0,
        byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
        bySource: {},
        oldestTimestamp: 0,
        newestTimestamp: 0
      }
    }
  }

  // Configuration methods
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): LoggerConfig {
    return { ...this.config }
  }
}

// Create singleton instance
export const logger = new LoggerService()