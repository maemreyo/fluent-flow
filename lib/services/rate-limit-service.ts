// Rate Limit Service - Prevents API abuse and manages request quotas
// Local rate limiting with sliding window algorithm

import type { RateLimitResult } from "../types"

export class RateLimitService {
  private requests = new Map<string, number[]>()
  private readonly cleanupInterval: number

  constructor() {
    // Clean up old request records every minute
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  canMakeRequest(
    key: string,
    maxRequests: number,
    windowMs: number
  ): boolean {
    const result = this.checkRateLimit(key, maxRequests, windowMs)
    return result.allowed
  }

  checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): RateLimitResult {
    const now = Date.now()
    const windowStart = now - windowMs

    // Get existing requests for this key
    let requests = this.requests.get(key) || []

    // Remove requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart)

    // Update the stored requests
    this.requests.set(key, requests)

    // Check if we can make a new request
    const allowed = requests.length < maxRequests
    const remaining = Math.max(0, maxRequests - requests.length - (allowed ? 1 : 0))
    const resetTime = Math.max(...requests, windowStart) + windowMs

    // If allowed, add the current request
    if (allowed) {
      requests.push(now)
      this.requests.set(key, requests)
    }

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
    }
  }

  getUsage(key: string, windowMs: number): {
    requests: number
    window: number
    percentage: number
  } {
    const now = Date.now()
    const windowStart = now - windowMs
    const requests = this.requests.get(key) || []
    const recentRequests = requests.filter(timestamp => timestamp > windowStart)

    return {
      requests: recentRequests.length,
      window: windowMs,
      percentage: 0 // Would need max limit to calculate
    }
  }

  // Preset rate limit configurations
  getUserRateLimit(userId: string): RateLimitResult {
    return this.checkRateLimit(`user:${userId}`, 100, 60000) // 100 requests per minute per user
  }

  getApiRateLimit(endpoint: string): RateLimitResult {
    const limits = {
      'api:process': { requests: 50, window: 60000 }, // 50 requests per minute
      'api:search': { requests: 200, window: 60000 }, // 200 requests per minute
      'api:upload': { requests: 10, window: 60000 }   // 10 requests per minute
    }

    const limit = limits[endpoint as keyof typeof limits] || { requests: 100, window: 60000 }
    return this.checkRateLimit(endpoint, limit.requests, limit.window)
  }

  // Adaptive rate limiting based on error rates
  checkAdaptiveRateLimit(
    key: string,
    baseMaxRequests: number,
    windowMs: number,
    errorRate: number = 0
  ): RateLimitResult {
    // Reduce allowed requests if error rate is high
    let adjustedMaxRequests = baseMaxRequests

    if (errorRate > 0.1) { // 10% error rate
      adjustedMaxRequests = Math.floor(baseMaxRequests * 0.5) // Reduce by 50%
    } else if (errorRate > 0.05) { // 5% error rate
      adjustedMaxRequests = Math.floor(baseMaxRequests * 0.75) // Reduce by 25%
    }

    return this.checkRateLimit(key, adjustedMaxRequests, windowMs)
  }

  // Burst handling - allow brief spikes but maintain average
  checkBurstRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    burstAllowance: number = 1.5
  ): RateLimitResult {
    const shortWindow = Math.floor(windowMs / 4) // 25% of main window
    const burstMax = Math.floor(maxRequests * burstAllowance / 4) // Allow burst in short window

    // Check short-term burst limit
    const burstResult = this.checkRateLimit(
      `${key}:burst`,
      burstMax,
      shortWindow
    )

    if (!burstResult.allowed) {
      return burstResult
    }

    // Check long-term average limit
    return this.checkRateLimit(key, maxRequests, windowMs)
  }

  // Reset rate limit for a specific key
  resetRateLimit(key: string): void {
    this.requests.delete(key)
  }

  // Get all active rate limits (for debugging)
  getActiveLimits(): Record<string, number[]> {
    const active: Record<string, number[]> = {}
    
    for (const [key, requests] of this.requests.entries()) {
      if (requests.length > 0) {
        active[key] = [...requests] // Copy array
      }
    }
    
    return active
  }

  // Clean up old request records
  private cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
    let cleanedKeys = 0

    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > cutoff)
      
      if (recentRequests.length === 0) {
        this.requests.delete(key)
        cleanedKeys++
      } else if (recentRequests.length < requests.length) {
        this.requests.set(key, recentRequests)
      }
    }

    if (cleanedKeys > 0) {
      console.log(`Rate limit cleanup: removed ${cleanedKeys} expired keys`)
    }
  }

  // Cleanup on service destruction
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.requests.clear()
  }

  // Create rate limiter with predefined settings
  static createUserLimiter(): RateLimitService {
    return new RateLimitService()
  }

  static createApiLimiter(): RateLimitService {
    return new RateLimitService()
  }

  // Utility to convert rate limit to human-readable format
  static formatRateLimit(result: RateLimitResult): string {
    if (result.allowed) {
      return `${result.remaining} requests remaining`
    } else {
      const waitTime = result.retryAfter || 0
      if (waitTime < 60) {
        return `Rate limited. Try again in ${waitTime} seconds`
      } else {
        const minutes = Math.ceil(waitTime / 60)
        return `Rate limited. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}`
      }
    }
  }
}