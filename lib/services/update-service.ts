import { logger } from './logger-service'
import { errorService } from './error-service'
import { notificationService } from './notification-service'
import { ImprovedBaseService } from './improved-base-service'
import { STORAGE_KEYS } from '../utils/constants'

export interface UpdateInfo {
  version: string
  releaseNotes: string
  downloadUrl: string
  checksum?: string
  size?: number
  releaseDate: string
  critical: boolean
  minimumVersion?: string
  features?: string[]
  bugFixes?: string[]
  breakingChanges?: string[]
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  updateInfo?: UpdateInfo
  isForced?: boolean
  downloadProgress?: number
}

export interface UpdateServiceConfig {
  enabled: boolean
  checkOnStartup: boolean
  autoDownload: boolean
  autoInstall: boolean
  checkInterval: number // hours
  updateEndpoint: string
  notifyUser: boolean
  allowBetaUpdates: boolean
  forceUpdates: boolean
}

export interface UpdateHistory {
  version: string
  installedAt: number
  previousVersion?: string
  source: 'auto' | 'manual' | 'forced'
  success: boolean
  errorMessage?: string
}

export class UpdateService extends ImprovedBaseService {
  private config: UpdateServiceConfig
  private checkTimer?: NodeJS.Timeout
  private currentVersion: string
  private updateHistory: UpdateHistory[] = []

  constructor(config?: Partial<UpdateServiceConfig>) {
    super()
    
    this.config = {
      enabled: true,
      checkOnStartup: true,
      autoDownload: false,
      autoInstall: false,
      checkInterval: 24, // 24 hours
      updateEndpoint: process.env.PLASMO_PUBLIC_UPDATE_ENDPOINT || 'https://api.example.com/updates',
      notifyUser: true,
      allowBetaUpdates: false,
      forceUpdates: false,
      ...config
    }

    this.currentVersion = this.getCurrentVersion()
    this.initializeUpdateService()
  }

  private getCurrentVersion(): string {
    try {
      return chrome.runtime.getManifest().version
    } catch (error) {
      logger.warn('Failed to get current version from manifest', 'UpdateService')
      return '1.0.0'
    }
  }

  private async initializeUpdateService(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Update service disabled', 'UpdateService')
      return
    }

    try {
      await this.loadUpdateHistory()
      
      if (this.config.checkOnStartup) {
        // Delay initial check to avoid startup conflicts
        setTimeout(() => {
          this.checkForUpdates()
        }, 5000)
      }

      this.schedulePeriodicChecks()
      
      logger.info('Update service initialized', 'UpdateService', { 
        currentVersion: this.currentVersion,
        config: this.config 
      })
    } catch (error) {
      errorService.reportError(error as Error, 'UpdateService initialization')
    }
  }

  private async loadUpdateHistory(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('update_history')
      this.updateHistory = result.update_history || []
      
      // Keep only last 20 updates
      if (this.updateHistory.length > 20) {
        this.updateHistory = this.updateHistory
          .sort((a, b) => b.installedAt - a.installedAt)
          .slice(0, 20)
        await this.saveUpdateHistory()
      }
    } catch (error) {
      logger.error('Failed to load update history', 'UpdateService', error)
    }
  }

  private async saveUpdateHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({
        'update_history': this.updateHistory
      })
    } catch (error) {
      logger.error('Failed to save update history', 'UpdateService', error)
    }
  }

  private schedulePeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
    }

    const intervalMs = this.config.checkInterval * 60 * 60 * 1000 // Convert hours to ms
    
    this.checkTimer = setInterval(() => {
      this.checkForUpdates()
    }, intervalMs)
    
    logger.debug('Periodic update checks scheduled', 'UpdateService', { 
      intervalHours: this.config.checkInterval 
    })
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length)
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0
      
      if (v1Part < v2Part) return -1
      if (v1Part > v2Part) return 1
    }
    
    return 0
  }

  private async fetchUpdateInfo(): Promise<UpdateInfo | null> {
    try {
      const params = new URLSearchParams({
        current_version: this.currentVersion,
        platform: 'chrome',
        allow_beta: this.config.allowBetaUpdates.toString()
      })

      const response = await this.get<{
        success: boolean
        data?: UpdateInfo
        message?: string
      }>(`${this.config.updateEndpoint}?${params}`)

      if (response.success && response.data) {
        return response.data
      }

      return null
    } catch (error) {
      logger.error('Failed to fetch update info', 'UpdateService', error)
      return null
    }
  }

  private async notifyUpdateAvailable(updateInfo: UpdateInfo, isForced: boolean = false): Promise<void> {
    if (!this.config.notifyUser) return

    try {
      const title = isForced ? 'Critical Update Required' : 'Update Available'
      const message = `Version ${updateInfo.version} is available. ${updateInfo.releaseNotes}`
      
      const buttons = []
      if (!this.config.autoInstall) {
        buttons.push(
          { title: 'Update Now', action: 'install_update' },
          { title: 'Later', action: 'dismiss' }
        )
      }

      await notificationService.show({
        title,
        message,
        type: 'basic',
        priority: isForced ? 'critical' : 'high',
        requireInteraction: isForced,
        persistent: isForced,
        buttons: buttons.length > 0 ? buttons : undefined,
        data: {
          updateInfo,
          isForced,
          action: 'update_available'
        }
      })

      logger.info('Update notification sent', 'UpdateService', { 
        version: updateInfo.version,
        isForced 
      })
    } catch (error) {
      errorService.reportError(error as Error, 'Update notification', { updateInfo })
    }
  }

  private async downloadUpdate(updateInfo: UpdateInfo): Promise<boolean> {
    try {
      logger.info('Starting update download', 'UpdateService', { version: updateInfo.version })
      
      // For Chrome extensions, we can't actually download the update file
      // The browser handles updates automatically through the Chrome Web Store
      // We can only notify the user and potentially redirect to the store
      
      if (updateInfo.downloadUrl) {
        // If it's a direct download URL (for manual installation)
        await chrome.tabs.create({ url: updateInfo.downloadUrl })
        
        logger.info('Opened download URL for manual update', 'UpdateService', { 
          url: updateInfo.downloadUrl 
        })
        
        return true
      } else {
        // For store updates, we can trigger a check
        if (chrome.runtime.requestUpdateCheck) {
          const result = await chrome.runtime.requestUpdateCheck()
          
          logger.info('Update check requested', 'UpdateService', { result })
          
          return result.status === 'update_available'
        }
      }
      
      return false
    } catch (error) {
      errorService.reportError(error as Error, 'Update download', { updateInfo })
      return false
    }
  }

  private async installUpdate(): Promise<boolean> {
    try {
      logger.info('Installing update', 'UpdateService')
      
      // For Chrome extensions, this triggers a reload with the new version
      if (chrome.runtime.reload) {
        chrome.runtime.reload()
        return true
      }
      
      return false
    } catch (error) {
      errorService.reportError(error as Error, 'Update installation')
      return false
    }
  }

  private async recordUpdateHistory(
    version: string, 
    source: UpdateHistory['source'], 
    success: boolean, 
    errorMessage?: string
  ): Promise<void> {
    try {
      const historyEntry: UpdateHistory = {
        version,
        installedAt: Date.now(),
        previousVersion: this.currentVersion,
        source,
        success,
        errorMessage
      }

      this.updateHistory.unshift(historyEntry)
      await this.saveUpdateHistory()
      
      logger.info('Update history recorded', 'UpdateService', historyEntry)
    } catch (error) {
      logger.error('Failed to record update history', 'UpdateService', error)
    }
  }

  // Public methods
  async checkForUpdates(notify: boolean = true): Promise<UpdateCheckResult> {
    if (!this.config.enabled) {
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion
      }
    }

    try {
      logger.info('Checking for updates', 'UpdateService', { currentVersion: this.currentVersion })
      
      const updateInfo = await this.fetchUpdateInfo()
      
      if (!updateInfo) {
        logger.debug('No update information available', 'UpdateService')
        return {
          hasUpdate: false,
          currentVersion: this.currentVersion
        }
      }

      const hasUpdate = this.compareVersions(this.currentVersion, updateInfo.version) < 0
      const isForced = updateInfo.critical || (
        updateInfo.minimumVersion && 
        this.compareVersions(this.currentVersion, updateInfo.minimumVersion) < 0
      )

      if (hasUpdate) {
        logger.info('Update available', 'UpdateService', { 
          currentVersion: this.currentVersion,
          latestVersion: updateInfo.version,
          isForced 
        })

        if (notify) {
          await this.notifyUpdateAvailable(updateInfo, isForced)
        }

        // Auto-download if enabled
        if (this.config.autoDownload || isForced) {
          const downloadSuccess = await this.downloadUpdate(updateInfo)
          
          // Auto-install if enabled and download successful
          if (downloadSuccess && (this.config.autoInstall || isForced)) {
            await this.performUpdate(updateInfo, isForced ? 'forced' : 'auto')
          }
        }
      } else {
        logger.debug('No updates available', 'UpdateService')
      }

      return {
        hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion: updateInfo.version,
        updateInfo: hasUpdate ? updateInfo : undefined,
        isForced
      }
    } catch (error) {
      errorService.reportError(error as Error, 'Update check')
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion
      }
    }
  }

  async performUpdate(updateInfo: UpdateInfo, source: UpdateHistory['source'] = 'manual'): Promise<boolean> {
    try {
      logger.info('Performing update', 'UpdateService', { 
        version: updateInfo.version,
        source 
      })

      // Download if not already downloaded
      const downloadSuccess = await this.downloadUpdate(updateInfo)
      if (!downloadSuccess) {
        await this.recordUpdateHistory(updateInfo.version, source, false, 'Download failed')
        return false
      }

      // Install the update
      const installSuccess = await this.installUpdate()
      
      await this.recordUpdateHistory(updateInfo.version, source, installSuccess)
      
      if (installSuccess) {
        await notificationService.showSuccess(
          'Update Successful',
          `Extension updated to version ${updateInfo.version}`
        )
      } else {
        await notificationService.showError(
          'Update Failed',
          'Failed to install the update. Please try again.'
        )
      }

      return installSuccess
    } catch (error) {
      errorService.reportError(error as Error, 'Update performance', { updateInfo, source })
      await this.recordUpdateHistory(updateInfo.version, source, false, (error as Error).message)
      return false
    }
  }

  async getLastUpdateCheck(): Promise<number> {
    try {
      const result = await chrome.storage.local.get('last_update_check')
      return result.last_update_check || 0
    } catch (error) {
      logger.error('Failed to get last update check time', 'UpdateService', error)
      return 0
    }
  }

  async setLastUpdateCheck(timestamp: number = Date.now()): Promise<void> {
    try {
      await chrome.storage.local.set({ 'last_update_check': timestamp })
    } catch (error) {
      logger.error('Failed to set last update check time', 'UpdateService', error)
    }
  }

  async getUpdateHistory(): Promise<UpdateHistory[]> {
    await this.loadUpdateHistory()
    return [...this.updateHistory]
  }

  async clearUpdateHistory(): Promise<void> {
    try {
      this.updateHistory = []
      await chrome.storage.local.remove('update_history')
      logger.info('Update history cleared', 'UpdateService')
    } catch (error) {
      errorService.reportError(error as Error, 'Clear update history')
    }
  }

  async getUpdateStats(): Promise<{
    totalUpdates: number
    successfulUpdates: number
    failedUpdates: number
    lastUpdate?: UpdateHistory
    averageUpdateInterval: number // days
  }> {
    await this.loadUpdateHistory()
    
    const totalUpdates = this.updateHistory.length
    const successfulUpdates = this.updateHistory.filter(h => h.success).length
    const failedUpdates = totalUpdates - successfulUpdates
    const lastUpdate = this.updateHistory[0]
    
    let averageUpdateInterval = 0
    if (this.updateHistory.length > 1) {
      const intervals = []
      for (let i = 0; i < this.updateHistory.length - 1; i++) {
        const timeDiff = this.updateHistory[i].installedAt - this.updateHistory[i + 1].installedAt
        intervals.push(timeDiff)
      }
      
      const avgMs = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      averageUpdateInterval = Math.round(avgMs / (1000 * 60 * 60 * 24)) // Convert to days
    }

    return {
      totalUpdates,
      successfulUpdates,
      failedUpdates,
      lastUpdate,
      averageUpdateInterval
    }
  }

  // Configuration methods
  updateConfig(config: Partial<UpdateServiceConfig>): void {
    const oldInterval = this.config.checkInterval
    this.config = { ...this.config, ...config }
    
    // Reschedule if interval changed
    if (this.config.checkInterval !== oldInterval) {
      this.schedulePeriodicChecks()
    }
    
    logger.info('Update service config updated', 'UpdateService', config)
  }

  getConfig(): UpdateServiceConfig {
    return { ...this.config }
  }

  getVersion(): string {
    return this.currentVersion
  }

  destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
    }
    logger.info('Update service destroyed', 'UpdateService')
  }
}

// Create singleton instance
export const updateService = new UpdateService()