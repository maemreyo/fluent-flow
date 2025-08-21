# Audio Storage Cleanup Strategy

## Storage Lifecycle Management

### Audio Storage Phases
1. **Capture Phase**: Audio extracted and stored temporarily
2. **Analysis Phase**: Audio sent to Gemini API for question generation
3. **Usage Phase**: User practices with generated questions
4. **Cleanup Phase**: Audio data removed based on cleanup policies

## Enhanced SavedLoop Interface
```typescript
export interface SavedLoop {
  // ... existing fields
  
  // Audio-related fields
  hasAudioSegment?: boolean
  audioSegmentBlob?: string  // Base64 encoded
  audioFormat?: 'webm' | 'wav'
  audioSize?: number
  
  // Lifecycle management fields
  audioCreatedAt?: Date
  audioLastUsed?: Date
  questionsGenerated?: boolean
  questionsGeneratedAt?: Date
  audioRetentionPolicy?: 'temporary' | 'keep' | 'auto-cleanup'
  cleanupScheduledAt?: Date
}

export interface ConversationQuestions {
  // ... existing fields
  
  // Storage management
  generatedFromAudio: boolean
  originalAudioSize: number
  canRegenerateQuestions: boolean  // If audio still exists
}
```

## Storage Cleanup Service
```typescript
export class AudioStorageCleanupService {
  private readonly DEFAULT_RETENTION_DAYS = 7
  private readonly MAX_STORAGE_SIZE_MB = 500  // 500MB limit
  
  async cleanupAudioStorage(): Promise<CleanupResult> {
    const allLoops = await this.getAllLoops()
    const audioLoops = allLoops.filter(loop => loop.hasAudioSegment)
    
    const cleanupResult: CleanupResult = {
      totalLoops: audioLoops.length,
      cleanedCount: 0,
      spaceFreedMB: 0,
      errors: []
    }
    
    // Strategy 1: Clean up based on retention policy
    await this.cleanupByRetentionPolicy(audioLoops, cleanupResult)
    
    // Strategy 2: Clean up based on storage limits
    await this.cleanupByStorageLimit(audioLoops, cleanupResult)
    
    // Strategy 3: Clean up orphaned audio (questions generated but failed)
    await this.cleanupOrphanedAudio(audioLoops, cleanupResult)
    
    return cleanupResult
  }
  
  private async cleanupByRetentionPolicy(loops: SavedLoop[], result: CleanupResult) {
    const now = new Date()
    
    for (const loop of loops) {
      const shouldCleanup = this.shouldCleanupAudio(loop, now)
      
      if (shouldCleanup.cleanup) {
        try {
          await this.removeAudioFromLoop(loop)
          result.cleanedCount++
          result.spaceFreedMB += (loop.audioSize || 0) / (1024 * 1024)
          
          console.log(`Cleaned audio for loop ${loop.id}: ${shouldCleanup.reason}`)
        } catch (error) {
          result.errors.push(`Failed to cleanup loop ${loop.id}: ${error}`)
        }
      }
    }
  }
  
  private shouldCleanupAudio(loop: SavedLoop, now: Date): { cleanup: boolean, reason: string } {
    // Rule 1: Explicit cleanup policy
    if (loop.audioRetentionPolicy === 'temporary') {
      return { cleanup: true, reason: 'Temporary retention policy' }
    }
    
    if (loop.audioRetentionPolicy === 'keep') {
      return { cleanup: false, reason: 'Keep policy set' }
    }
    
    // Rule 2: Auto cleanup based on usage and time
    const audioAge = loop.audioCreatedAt ? 
      (now.getTime() - loop.audioCreatedAt.getTime()) / (1000 * 60 * 60 * 24) : 0
    
    // Clean up after 7 days if questions were generated
    if (loop.questionsGenerated && audioAge > this.DEFAULT_RETENTION_DAYS) {
      return { cleanup: true, reason: `Questions generated ${audioAge.toFixed(1)} days ago` }
    }
    
    // Clean up after 2 days if questions generation failed
    if (!loop.questionsGenerated && audioAge > 2) {
      return { cleanup: true, reason: `Questions not generated after ${audioAge.toFixed(1)} days` }
    }
    
    // Clean up if not used for 14 days
    const lastUsed = loop.audioLastUsed || loop.audioCreatedAt
    if (lastUsed) {
      const unusedDays = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)
      if (unusedDays > 14) {
        return { cleanup: true, reason: `Not used for ${unusedDays.toFixed(1)} days` }
      }
    }
    
    return { cleanup: false, reason: 'Within retention limits' }
  }
  
  private async cleanupByStorageLimit(loops: SavedLoop[], result: CleanupResult) {
    const totalStorageUsed = await this.calculateTotalAudioStorage()
    
    if (totalStorageUsed > this.MAX_STORAGE_SIZE_MB) {
      // Sort by oldest and least used first
      const sortedLoops = loops
        .filter(l => l.hasAudioSegment && !this.shouldKeepAudio(l))
        .sort((a, b) => {
          const aLastUsed = a.audioLastUsed || a.audioCreatedAt || new Date(0)
          const bLastUsed = b.audioLastUsed || b.audioCreatedAt || new Date(0)
          return aLastUsed.getTime() - bLastUsed.getTime()
        })
      
      let freedSpace = 0
      for (const loop of sortedLoops) {
        if (totalStorageUsed - freedSpace <= this.MAX_STORAGE_SIZE_MB * 0.8) break
        
        await this.removeAudioFromLoop(loop)
        freedSpace += (loop.audioSize || 0) / (1024 * 1024)
        result.cleanedCount++
      }
      
      result.spaceFreedMB += freedSpace
    }
  }
  
  private shouldKeepAudio(loop: SavedLoop): boolean {
    return loop.audioRetentionPolicy === 'keep' || 
           (loop.questionsGenerated && 
            (new Date().getTime() - (loop.audioCreatedAt?.getTime() || 0)) < 24 * 60 * 60 * 1000) // Less than 24 hours old
  }
  
  private async removeAudioFromLoop(loop: SavedLoop): Promise<void> {
    const updatedLoop: SavedLoop = {
      ...loop,
      hasAudioSegment: false,
      audioSegmentBlob: undefined,
      audioFormat: undefined,
      audioSize: undefined,
      cleanupScheduledAt: new Date()
    }
    
    await this.saveLoop(updatedLoop)
  }
}

interface CleanupResult {
  totalLoops: number
  cleanedCount: number
  spaceFreedMB: number
  errors: string[]
}
```

## User-Controlled Cleanup Options
```typescript
export class UserCleanupService {
  async setRetentionPolicy(loopId: string, policy: 'temporary' | 'keep' | 'auto-cleanup') {
    const loop = await this.getLoop(loopId)
    loop.audioRetentionPolicy = policy
    await this.saveLoop(loop)
  }
  
  async cleanupLoopAudio(loopId: string): Promise<boolean> {
    const loop = await this.getLoop(loopId)
    if (!loop.hasAudioSegment) return false
    
    // Keep questions but remove audio
    loop.hasAudioSegment = false
    loop.audioSegmentBlob = undefined
    loop.audioFormat = undefined
    loop.audioSize = undefined
    loop.cleanupScheduledAt = new Date()
    
    await this.saveLoop(loop)
    return true
  }
  
  async getStorageStats(): Promise<StorageStats> {
    const allLoops = await this.getAllLoops()
    const audioLoops = allLoops.filter(l => l.hasAudioSegment)
    
    const totalSize = audioLoops.reduce((sum, loop) => sum + (loop.audioSize || 0), 0)
    const oldestAudio = audioLoops
      .map(l => l.audioCreatedAt)
      .filter(d => d)
      .sort((a, b) => a!.getTime() - b!.getTime())[0]
    
    return {
      totalAudioFiles: audioLoops.length,
      totalSizeMB: totalSize / (1024 * 1024),
      oldestAudioDate: oldestAudio,
      scheduledForCleanup: audioLoops.filter(l => l.cleanupScheduledAt).length
    }
  }
}

interface StorageStats {
  totalAudioFiles: number
  totalSizeMB: number
  oldestAudioDate?: Date
  scheduledForCleanup: number
}
```

## UI Integration for Cleanup Management
```tsx
const StorageManagementPanel = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  
  const handleCleanupNow = async () => {
    const cleanupService = new AudioStorageCleanupService()
    const result = await cleanupService.cleanupAudioStorage()
    setCleanupResult(result)
    
    // Refresh stats
    const userService = new UserCleanupService()
    const stats = await userService.getStorageStats()
    setStorageStats(stats)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Storage Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {storageStats && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Audio Files</p>
              <p className="text-2xl font-bold">{storageStats.totalAudioFiles}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold">{storageStats.totalSizeMB.toFixed(1)} MB</p>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button onClick={handleCleanupNow} variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            Cleanup Now
          </Button>
          <Button variant="secondary">
            <Settings className="w-4 h-4 mr-2" />
            Cleanup Settings
          </Button>
        </div>
        
        {cleanupResult && (
          <Alert>
            <AlertDescription>
              Cleaned {cleanupResult.cleanedCount} files, freed {cleanupResult.spaceFreedMB.toFixed(1)} MB
            </Alert>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// In individual loop cards
const LoopAudioActions = ({ loop }: { loop: SavedLoop }) => {
  const [retentionPolicy, setRetentionPolicy] = useState(loop.audioRetentionPolicy || 'auto-cleanup')
  
  const handlePolicyChange = async (policy: string) => {
    const userService = new UserCleanupService()
    await userService.setRetentionPolicy(loop.id, policy as any)
    setRetentionPolicy(policy as any)
  }
  
  return (
    <div className="flex items-center gap-2">
      <Select value={retentionPolicy} onValueChange={handlePolicyChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="temporary">Temporary</SelectItem>
          <SelectItem value="keep">Keep</SelectItem>
          <SelectItem value="auto-cleanup">Auto</SelectItem>
        </SelectContent>
      </Select>
      
      {loop.hasAudioSegment && (
        <Badge variant="secondary" className="text-xs">
          {((loop.audioSize || 0) / 1024).toFixed(1)} KB
        </Badge>
      )}
    </div>
  )
}
```

## Automatic Cleanup Scheduler
```typescript
// Background cleanup service
export class AutoCleanupScheduler {
  private cleanupInterval: NodeJS.Timeout | null = null
  
  start() {
    // Run cleanup every 6 hours
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleanupService = new AudioStorageCleanupService()
        const result = await cleanupService.cleanupAudioStorage()
        
        if (result.cleanedCount > 0) {
          console.log(`Auto-cleanup: ${result.cleanedCount} files, ${result.spaceFreedMB.toFixed(1)} MB freed`)
        }
      } catch (error) {
        console.error('Auto-cleanup failed:', error)
      }
    }, 6 * 60 * 60 * 1000) // 6 hours
  }
  
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}
```

## Cleanup Strategy Summary

1. **Immediate Cleanup**: After questions generated successfully
2. **Time-based**: 7 days for used, 2 days for unused
3. **Size-based**: When total storage > 500MB  
4. **User-controlled**: Manual cleanup and retention policies
5. **Auto-scheduled**: Every 6 hours background cleanup
6. **Graceful degradation**: Keep questions even after audio cleanup