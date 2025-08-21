import type { SavedLoop, CleanupResult, StorageStats } from '../types/fluent-flow-types'

export class AudioStorageCleanupService {
  private readonly DEFAULT_RETENTION_DAYS = 7
  private readonly MAX_STORAGE_SIZE_MB = 500  // 500MB limit
  private storageService: any // Will be injected

  constructor(storageService: any) {
    this.storageService = storageService
  }
  /**
   * Helper method to get a single loop by ID
   */
  private async getLoop(loopId: string): Promise<SavedLoop | null> {
    const allLoops = await this.storageService.getAllUserLoops()
    return allLoops.find(loop => loop.id === loopId) || null
  }

  /**
   * Main cleanup function - runs all cleanup strategies
   */
  async cleanupAudioStorage(): Promise<CleanupResult> {
    console.log('Starting audio storage cleanup...')
    
    const allLoops = await this.storageService.getAllUserLoops()
    const audioLoops = allLoops.filter((loop: SavedLoop) => loop.hasAudioSegment)

    const cleanupResult: CleanupResult = {
      totalLoops: audioLoops.length,
      cleanedCount: 0,
      spaceFreedMB: 0,
      errors: []
    }

    if (audioLoops.length === 0) {
      console.log('No audio files to cleanup')
      return cleanupResult
    }

    // Strategy 1: Clean up based on retention policy
    await this.cleanupByRetentionPolicy(audioLoops, cleanupResult)

    // Strategy 2: Clean up based on storage limits
    await this.cleanupByStorageLimit(audioLoops, cleanupResult)

    // Strategy 3: Clean up orphaned audio (questions generation failed)
    await this.cleanupOrphanedAudio(audioLoops, cleanupResult)

    console.log(`Cleanup completed: ${cleanupResult.cleanedCount} files cleaned, ${cleanupResult.spaceFreedMB.toFixed(2)}MB freed`)
    
    return cleanupResult
  }

  /**
   * Cleanup based on retention policies and time rules
   */
  private async cleanupByRetentionPolicy(loops: SavedLoop[], result: CleanupResult): Promise<void> {
    const now = new Date()

    for (const loop of loops) {
      const shouldCleanup = this.shouldCleanupAudio(loop, now)

      if (shouldCleanup.cleanup) {
        try {
          const freedSpace = await this.removeAudioFromLoop(loop)
          result.cleanedCount++
          result.spaceFreedMB += freedSpace

          console.log(`Cleaned audio for loop ${loop.id}: ${shouldCleanup.reason}`)
        } catch (error) {
          const errorMessage = `Failed to cleanup loop ${loop.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMessage)
          console.error(errorMessage)
        }
      }
    }
  }

  /**
   * Cleanup based on total storage size limits
   */
  private async cleanupByStorageLimit(loops: SavedLoop[], result: CleanupResult): Promise<void> {
    const totalStorageUsed = await this.calculateTotalAudioStorage()

    if (totalStorageUsed <= this.MAX_STORAGE_SIZE_MB) {
      return // Under limit
    }

    console.log(`Storage limit exceeded: ${totalStorageUsed.toFixed(2)}MB / ${this.MAX_STORAGE_SIZE_MB}MB`)

    // Sort by priority: oldest and least recently used first
    const sortedLoops = loops
      .filter(loop => loop.hasAudioSegment && !this.shouldKeepAudio(loop))
      .sort((a, b) => {
        const aLastUsed = a.audioLastUsed || a.audioCreatedAt || new Date(0)
        const bLastUsed = b.audioLastUsed || b.audioCreatedAt || new Date(0)
        return aLastUsed.getTime() - bLastUsed.getTime()
      })

    const targetSize = this.MAX_STORAGE_SIZE_MB * 0.8 // Clean to 80% of limit
    let currentStorage = totalStorageUsed

    for (const loop of sortedLoops) {
      if (currentStorage <= targetSize) break

      try {
        const freedSpace = await this.removeAudioFromLoop(loop)
        currentStorage -= freedSpace
        result.cleanedCount++
        result.spaceFreedMB += freedSpace

        console.log(`Size-based cleanup: removed audio from loop ${loop.id}`)
      } catch (error) {
        const errorMessage = `Failed to cleanup loop ${loop.id} (size-based): ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMessage)
      }
    }
  }

  /**
   * Cleanup orphaned audio (failed question generation)
   */
  private async cleanupOrphanedAudio(loops: SavedLoop[], result: CleanupResult): Promise<void> {
    const now = new Date()
    const orphanedLoops = loops.filter(loop => {
      if (!loop.hasAudioSegment || loop.questionsGenerated) return false
      
      const audioAge = loop.audioCreatedAt ? 
        (now.getTime() - loop.audioCreatedAt.getTime()) / (1000 * 60 * 60 * 24) : 0

      // Consider orphaned if audio exists for more than 2 days without questions
      return audioAge > 2
    })

    for (const loop of orphanedLoops) {
      try {
        const freedSpace = await this.removeAudioFromLoop(loop)
        result.cleanedCount++
        result.spaceFreedMB += freedSpace

        console.log(`Cleaned orphaned audio for loop ${loop.id}`)
      } catch (error) {
        result.errors.push(`Failed to cleanup orphaned loop ${loop.id}: ${error}`)
      }
    }
  }

  /**
   * Determines if a loop's audio should be cleaned up
   */
  private shouldCleanupAudio(loop: SavedLoop, now: Date): { cleanup: boolean, reason: string } {
    // Rule 1: Explicit cleanup policies
    if (loop.audioRetentionPolicy === 'temporary') {
      return { cleanup: true, reason: 'Temporary retention policy' }
    }

    if (loop.audioRetentionPolicy === 'keep') {
      return { cleanup: false, reason: 'Keep policy set' }
    }

    // Rule 2: Scheduled for cleanup
    if (loop.cleanupScheduledAt) {
      return { cleanup: true, reason: 'Scheduled for cleanup' }
    }

    // Rule 3: Time-based cleanup
    const audioAge = loop.audioCreatedAt ? 
      (now.getTime() - loop.audioCreatedAt.getTime()) / (1000 * 60 * 60 * 24) : 0

    // Clean up after retention period if questions were generated
    if (loop.questionsGenerated && audioAge > this.DEFAULT_RETENTION_DAYS) {
      return { 
        cleanup: true, 
        reason: `Questions generated ${audioAge.toFixed(1)} days ago` 
      }
    }

    // Clean up after 2 days if questions generation failed
    if (!loop.questionsGenerated && audioAge > 2) {
      return { 
        cleanup: true, 
        reason: `Questions not generated after ${audioAge.toFixed(1)} days` 
      }
    }

    // Clean up if not used for extended period
    const lastUsed = loop.audioLastUsed || loop.audioCreatedAt
    if (lastUsed) {
      const unusedDays = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)
      if (unusedDays > 14) {
        return { 
          cleanup: true, 
          reason: `Not used for ${unusedDays.toFixed(1)} days` 
        }
      }
    }

    return { cleanup: false, reason: 'Within retention limits' }
  }

  /**
   * Determines if audio should be kept regardless of other rules
   */
  private shouldKeepAudio(loop: SavedLoop): boolean {
    // Always keep if explicitly set to keep
    if (loop.audioRetentionPolicy === 'keep') return true
    
    // Keep recent successful question generations for 24 hours
    if (loop.questionsGenerated && loop.audioCreatedAt) {
      const ageHours = (new Date().getTime() - loop.audioCreatedAt.getTime()) / (1000 * 60 * 60)
      if (ageHours < 24) return true
    }

    return false
  }

  /**
   * Removes audio data from a loop
   */
  private async removeAudioFromLoop(loop: SavedLoop): Promise<number> {
    const originalSize = loop.audioSize || 0
    const originalSizeMB = originalSize / (1024 * 1024)

    // Update loop to remove audio data
    const updatedLoop: SavedLoop = {
      ...loop,
      hasAudioSegment: false,
      audioSegmentBlob: undefined,
      audioFormat: undefined,
      audioSize: undefined,
      cleanupScheduledAt: new Date(),
      updatedAt: new Date()
    }

    await this.storageService.saveLoop(updatedLoop)
    return originalSizeMB
  }

  /**
   * Calculates total storage used by audio files
   */
  async calculateTotalAudioStorage(): Promise<number> {
    const allLoops = await this.storageService.getAllUserLoops()
    const totalBytes = allLoops
      .filter((loop: SavedLoop) => loop.hasAudioSegment)
      .reduce((sum: number, loop: SavedLoop) => sum + (loop.audioSize || 0), 0)

    return totalBytes / (1024 * 1024) // Convert to MB
  }

  /**
   * Gets detailed storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const allLoops = await this.storageService.getAllUserLoops()
    const audioLoops = allLoops.filter((loop: SavedLoop) => loop.hasAudioSegment)

    const totalSize = audioLoops.reduce((sum: number, loop: SavedLoop) => sum + (loop.audioSize || 0), 0)
    const totalSizeMB = totalSize / (1024 * 1024)

    // Find oldest audio
    const oldestAudio = audioLoops
      .map((loop: SavedLoop) => loop.audioCreatedAt)
      .filter((date): date is Date => !!date)
      .sort((a, b) => a.getTime() - b.getTime())[0]

    // Find largest files
    const largestFiles = audioLoops
      .map((loop: SavedLoop) => ({
        loopId: loop.id,
        title: loop.title,
        sizeMB: (loop.audioSize || 0) / (1024 * 1024),
        createdAt: loop.audioCreatedAt || loop.createdAt
      }))
      .sort((a, b) => b.sizeMB - a.sizeMB)
      .slice(0, 5)

    return {
      totalAudioFiles: audioLoops.length,
      totalSizeMB,
      oldestAudioDate: oldestAudio,
      scheduledForCleanup: audioLoops.filter((loop: SavedLoop) => loop.cleanupScheduledAt).length,
      largestFiles
    }
  }

  /**
   * Force cleanup of specific loop
   */
  async cleanupSpecificLoop(loopId: string): Promise<boolean> {
    // Input validation
    if (!loopId || typeof loopId !== 'string') {
      throw new Error('Valid loop ID is required')
    }

    if (loopId.trim().length === 0) {
      throw new Error('Loop ID cannot be empty')
    }

    const loop = await this.getLoop(loopId)
    if (!loop) {
      console.warn(`Loop ${loopId} not found for cleanup`)
      return false
    }

    if (!loop.hasAudioSegment) {
      console.warn(`Loop ${loopId} has no audio to cleanup`)
      return false
    }

    try {
      await this.removeAudioFromLoop(loop)
      console.log(`Manual cleanup: removed audio from loop ${loopId}`)
      return true
    } catch (error) {
      console.error(`Failed to manually cleanup loop ${loopId}:`, error)
      throw new Error(`Failed to cleanup loop: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Schedules a loop for cleanup
   */
  async scheduleCleanup(loopId: string, delayDays: number = 0): Promise<void> {
    const loop = await this.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    const scheduledTime = new Date()
    scheduledTime.setDate(scheduledTime.getDate() + delayDays)

    loop.cleanupScheduledAt = scheduledTime
    loop.updatedAt = new Date()

    await this.storageService.saveLoop(loop)
  }

  /**
   * Cancels scheduled cleanup
   */
  async cancelScheduledCleanup(loopId: string): Promise<void> {
    const loop = await this.getLoop(loopId)
    if (!loop) {
      throw new Error('Loop not found')
    }

    loop.cleanupScheduledAt = undefined
    loop.updatedAt = new Date()

    await this.storageService.saveLoop(loop)
  }

  /**
   * Gets loops scheduled for cleanup
   */
  async getScheduledCleanups(): Promise<SavedLoop[]> {
    const allLoops = await this.storageService.getAllUserLoops()
    return allLoops.filter((loop: SavedLoop) => 
      loop.hasAudioSegment && loop.cleanupScheduledAt
    )
  }

  /**
   * Sets retention policy for multiple loops
   */
  async bulkSetRetentionPolicy(
    loopIds: string[], 
    policy: 'temporary' | 'keep' | 'auto-cleanup'
  ): Promise<number> {
    // Input validation
    if (!Array.isArray(loopIds)) {
      throw new Error('Loop IDs must be provided as an array')
    }

    if (loopIds.length === 0) {
      console.warn('No loop IDs provided for bulk retention policy update')
      return 0
    }

    if (loopIds.length > 1000) {
      throw new Error('Bulk operation limited to 1000 loops at once')
    }

    const validPolicies = ['temporary', 'keep', 'auto-cleanup'] as const
    if (!validPolicies.includes(policy)) {
      throw new Error(`Invalid retention policy: ${policy}. Must be one of: ${validPolicies.join(', ')}`)
    }

    // Validate all loop IDs are valid strings
    const invalidIds = loopIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0)
    if (invalidIds.length > 0) {
      throw new Error(`Invalid loop IDs found: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? '...' : ''}`)
    }

    let updatedCount = 0

    for (const loopId of loopIds) {
      try {
        const loop = await this.getLoop(loopId.trim())
        if (loop) {
          loop.audioRetentionPolicy = policy
          loop.updatedAt = new Date()

          if (policy === 'temporary') {
            loop.cleanupScheduledAt = new Date()
          } else if (policy === 'keep') {
            loop.cleanupScheduledAt = undefined
          }

          await this.storageService.saveLoop(loop)
          updatedCount++
        } else {
          console.warn(`Loop ${loopId} not found for retention policy update`)
        }
      } catch (error) {
        console.error(`Failed to update retention policy for loop ${loopId}:`, error)
        // Continue with other loops rather than failing the entire operation
      }
    }

    console.log(`Bulk retention policy update completed: ${updatedCount}/${loopIds.length} loops updated`)
    return updatedCount
  }

  /**
   * Cleanup old temporary files immediately
   */
  async emergencyCleanup(): Promise<CleanupResult> {
    console.log('Starting emergency cleanup...')
    
    const allLoops = await this.storageService.getAllUserLoops()
    const temporaryLoops = allLoops.filter((loop: SavedLoop) => 
      loop.hasAudioSegment && 
      (loop.audioRetentionPolicy === 'temporary' || loop.cleanupScheduledAt)
    )

    const result: CleanupResult = {
      totalLoops: temporaryLoops.length,
      cleanedCount: 0,
      spaceFreedMB: 0,
      errors: []
    }

    for (const loop of temporaryLoops) {
      try {
        const freedSpace = await this.removeAudioFromLoop(loop)
        result.cleanedCount++
        result.spaceFreedMB += freedSpace
      } catch (error) {
        result.errors.push(`Emergency cleanup failed for loop ${loop.id}: ${error}`)
      }
    }

    console.log(`Emergency cleanup completed: ${result.cleanedCount} files cleaned`)
    return result
  }
}

export default AudioStorageCleanupService