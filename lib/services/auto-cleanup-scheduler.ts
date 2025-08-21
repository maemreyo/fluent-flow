import { AudioStorageCleanupService } from './audio-storage-cleanup-service'

export class AutoCleanupScheduler {
  private cleanupInterval: NodeJS.Timeout | null = null
  private cleanupService: AudioStorageCleanupService
  private isRunning = false
  private readonly CLEANUP_INTERVAL_HOURS = 6

  constructor(cleanupService: AudioStorageCleanupService) {
    this.cleanupService = cleanupService
  }

  /**
   * Starts the automatic cleanup scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Auto cleanup scheduler is already running')
      return
    }

    console.log(`Starting auto cleanup scheduler (every ${this.CLEANUP_INTERVAL_HOURS} hours)`)

    // Run initial cleanup after 1 minute
    setTimeout(() => {
      this.runCleanup()
    }, 60 * 1000)

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup()
    }, this.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000)

    this.isRunning = true
  }

  /**
   * Stops the automatic cleanup scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.isRunning = false
    console.log('Auto cleanup scheduler stopped')
  }

  /**
   * Checks if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning
  }

  /**
   * Manually trigger cleanup (doesn't affect scheduled runs)
   */
  async triggerCleanup(): Promise<void> {
    await this.runCleanup()
  }

  /**
   * Runs the cleanup process
   */
  private async runCleanup(): Promise<void> {
    try {
      console.log('Running scheduled audio cleanup...')
      const startTime = Date.now()
      
      const result = await this.cleanupService.cleanupAudioStorage()
      
      const duration = Date.now() - startTime
      
      if (result.cleanedCount > 0) {
        console.log(
          `Auto-cleanup completed: ${result.cleanedCount} files cleaned, ` +
          `${result.spaceFreedMB.toFixed(2)}MB freed in ${duration}ms`
        )
        
        // Dispatch cleanup event for UI updates
        this.dispatchCleanupEvent(result)
      } else {
        console.log('Auto-cleanup: No files needed cleaning')
      }

      if (result.errors.length > 0) {
        console.warn('Auto-cleanup errors:', result.errors)
      }

    } catch (error) {
      console.error('Auto-cleanup failed:', error)
    }
  }

  /**
   * Dispatches cleanup event for UI components to listen to
   */
  private dispatchCleanupEvent(result: any): void {
    try {
      const event = new CustomEvent('fluent-flow-audio-cleanup', {
        detail: result
      })
      document.dispatchEvent(event)
    } catch (error) {
      // Ignore event dispatch errors
    }
  }

  /**
   * Gets scheduler status info
   */
  getStatus(): {
    isRunning: boolean
    nextCleanupTime: Date | null
    intervalHours: number
  } {
    let nextCleanupTime: Date | null = null
    
    if (this.isRunning && this.cleanupInterval) {
      nextCleanupTime = new Date(Date.now() + this.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000)
    }

    return {
      isRunning: this.isRunning,
      nextCleanupTime,
      intervalHours: this.CLEANUP_INTERVAL_HOURS
    }
  }

  /**
   * Updates cleanup interval (requires restart)
   */
  setCleanupInterval(hours: number): void {
    if (hours < 1 || hours > 24) {
      throw new Error('Cleanup interval must be between 1 and 24 hours')
    }

    const wasRunning = this.isRunning
    
    if (wasRunning) {
      this.stop()
    }

    // Update interval (type assertion needed due to readonly)
    ;(this as any).CLEANUP_INTERVAL_HOURS = hours

    if (wasRunning) {
      this.start()
    }

    console.log(`Cleanup interval updated to ${hours} hours`)
  }
}

/**
 * Global scheduler instance manager
 */
export class CleanupSchedulerManager {
  private static instance: AutoCleanupScheduler | null = null

  /**
   * Gets or creates the global scheduler instance
   */
  static getInstance(cleanupService?: AudioStorageCleanupService): AutoCleanupScheduler {
    if (!CleanupSchedulerManager.instance && cleanupService) {
      CleanupSchedulerManager.instance = new AutoCleanupScheduler(cleanupService)
    }

    if (!CleanupSchedulerManager.instance) {
      throw new Error('Cleanup service required for first initialization')
    }

    return CleanupSchedulerManager.instance
  }

  /**
   * Initializes and starts the global scheduler
   */
  static initialize(cleanupService: AudioStorageCleanupService): AutoCleanupScheduler {
    const scheduler = CleanupSchedulerManager.getInstance(cleanupService)
    scheduler.start()
    return scheduler
  }

  /**
   * Stops and destroys the global scheduler
   */
  static shutdown(): void {
    if (CleanupSchedulerManager.instance) {
      CleanupSchedulerManager.instance.stop()
      CleanupSchedulerManager.instance = null
    }
  }
}

export default AutoCleanupScheduler