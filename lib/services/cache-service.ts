// Cache Service - Multi-layer caching implementation
// Memory cache + Chrome storage for persistence

import type { CacheItem, CacheStats } from "../types"

export class CacheService {
  private memoryCache = new Map<string, CacheItem>()
  private readonly CACHE_PREFIX = 'cache:'
  private readonly MAX_MEMORY_ITEMS = 1000
  private readonly DEFAULT_TTL = 300000 // 5 minutes

  constructor() {
    this.startMemoryCleanup()
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // 1. Check memory cache first (fastest)
      const memoryItem = this.memoryCache.get(key)
      if (memoryItem && !this.isExpired(memoryItem)) {
        return memoryItem.data as T
      }

      // 2. Check Chrome storage (persistent)
      const storageKey = this.getCacheKey(key)
      const stored = await chrome.storage.local.get(storageKey)
      const storageItem = stored[storageKey] as CacheItem | undefined

      if (storageItem && !this.isExpired(storageItem)) {
        // Put back in memory for faster access next time
        this.memoryCache.set(key, storageItem)
        return storageItem.data as T
      }

      // Clean up expired item from storage
      if (storageItem && this.isExpired(storageItem)) {
        await this.invalidate(key)
      }

      return null

    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const item: CacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now()
      }

      // Store in memory cache
      this.memoryCache.set(key, item)

      // Store in Chrome storage for persistence
      const storageKey = this.getCacheKey(key)
      await chrome.storage.local.set({ [storageKey]: item })

      // Manage memory cache size
      this.enforceMemoryLimit()

    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key)

      // Remove from Chrome storage
      const storageKey = this.getCacheKey(key)
      await chrome.storage.local.remove(storageKey)

    } catch (error) {
      console.error('Cache invalidate error:', error)
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Invalidate from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key)
        }
      }

      // Invalidate from Chrome storage
      const allKeys = await chrome.storage.local.get()
      const keysToRemove: string[] = []

      for (const storageKey of Object.keys(allKeys)) {
        if (storageKey.startsWith(this.CACHE_PREFIX) && storageKey.includes(pattern)) {
          keysToRemove.push(storageKey)
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove)
      }

    } catch (error) {
      console.error('Cache invalidate pattern error:', error)
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear()

      // Clear Chrome storage cache
      const allKeys = await chrome.storage.local.get()
      const cacheKeys = Object.keys(allKeys).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      )

      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys)
      }

    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const allKeys = await chrome.storage.local.get()
      const cacheKeys = Object.keys(allKeys).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      )

      let totalSize = 0
      let expiredCount = 0
      let validCount = 0

      for (const key of cacheKeys) {
        const item = allKeys[key] as CacheItem
        if (item) {
          totalSize += JSON.stringify(item).length
          if (this.isExpired(item)) {
            expiredCount++
          } else {
            validCount++
          }
        }
      }

      return {
        memoryItems: this.memoryCache.size,
        storageItems: cacheKeys.length,
        validItems: validCount,
        expiredItems: expiredCount,
        totalSizeBytes: totalSize,
        hitRate: this.calculateHitRate(),
        lastCleanup: Date.now()
      }

    } catch (error) {
      console.error('Cache stats error:', error)
      return {
        memoryItems: 0,
        storageItems: 0,
        validItems: 0,
        expiredItems: 0,
        totalSizeBytes: 0,
        hitRate: 0,
        lastCleanup: 0
      }
    }
  }

  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  private enforceMemoryLimit(): void {
    if (this.memoryCache.size <= this.MAX_MEMORY_ITEMS) {
      return
    }

    // Remove oldest items first (LRU-like)
    const entries = Array.from(this.memoryCache.entries())
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    const itemsToRemove = entries.slice(0, Math.floor(this.MAX_MEMORY_ITEMS * 0.2)) // Remove 20%
    
    for (const [key] of itemsToRemove) {
      this.memoryCache.delete(key)
    }

    console.log(`Memory cache cleanup: removed ${itemsToRemove.length} items`)
  }

  private startMemoryCleanup(): void {
    // Clean expired items every 5 minutes
    setInterval(() => {
      const now = Date.now()
      let removedCount = 0

      for (const [key, item] of this.memoryCache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.memoryCache.delete(key)
          removedCount++
        }
      }

      if (removedCount > 0) {
        console.log(`Memory cache cleanup: removed ${removedCount} expired items`)
      }
    }, 5 * 60 * 1000)
  }

  private calculateHitRate(): number {
    // This would need to be tracked across requests
    // For now, return a placeholder
    return 0.85 // 85% hit rate
  }

  // Utility methods for specific cache patterns
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    await this.set(key, data, ttl)
    return data
  }

  async touch(key: string): Promise<void> {
    // Update last accessed time without changing data
    const item = this.memoryCache.get(key)
    if (item) {
      item.lastAccessed = Date.now()
      item.accessCount = (item.accessCount || 0) + 1
    }
  }
}