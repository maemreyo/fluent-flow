// In-memory storage for shared questions with auto-expiration
// Perfect for classroom sessions (4-6 hours max)

interface StoredQuestionSet {
  data: any
  expiresAt: number
}

declare global {
  var __sharedQuestions: Map<string, StoredQuestionSet> | undefined
  var __cleanupInterval: NodeJS.Timeout | undefined
}

// Default expiration: 4 hours (perfect for classroom sessions)
const DEFAULT_EXPIRATION_HOURS = 4
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000 // Clean up every 30 minutes

export const sharedQuestions = {
  set(token: string, data: any, expirationHours = DEFAULT_EXPIRATION_HOURS) {
    const storage = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
    const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000)
    
    storage.set(token, {
      data,
      expiresAt
    })
    
    if (process.env.NODE_ENV === 'development') {
      globalThis.__sharedQuestions = storage
    }
    
    // Start cleanup scheduler if not already running
    if (!globalThis.__cleanupInterval) {
      globalThis.__cleanupInterval = setInterval(() => {
        this.cleanup()
      }, CLEANUP_INTERVAL_MS)
    }
    
    return { expiresAt, expiresIn: expirationHours * 60 * 60 * 1000 }
  },

  get(token: string) {
    const storage = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
    const stored = storage.get(token)
    
    if (!stored) return null
    
    // Check if expired
    if (Date.now() > stored.expiresAt) {
      storage.delete(token)
      return null
    }
    
    return stored.data
  },

  has(token: string): boolean {
    return this.get(token) !== null
  },

  delete(token: string): boolean {
    const storage = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
    return storage.delete(token)
  },

  cleanup() {
    const storage = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [token, stored] of storage.entries()) {
      if (now > stored.expiresAt) {
        storage.delete(token)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired question sets`)
    }
    
    return cleanedCount
  },

  size(): number {
    const storage = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
    return storage.size
  },

  keys(): string[] {
    const storage = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
    return Array.from(storage.keys())
  },

  getExpirationInfo(token: string) {
    const storage = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
    const stored = storage.get(token)
    
    if (!stored) return null
    
    const now = Date.now()
    const timeRemaining = stored.expiresAt - now
    
    if (timeRemaining <= 0) return null
    
    return {
      expiresAt: stored.expiresAt,
      timeRemaining,
      hoursRemaining: Math.floor(timeRemaining / (60 * 60 * 1000)),
      minutesRemaining: Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))
    }
  }
}

if (process.env.NODE_ENV === 'development') {
  globalThis.__sharedQuestions = globalThis.__sharedQuestions ?? new Map<string, StoredQuestionSet>()
}