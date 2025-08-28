// Supabase Payment Service - Handles payment features via Supabase RPC functions
// Implements safe payment operations without exposing sensitive data

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  DatabaseSubscription,
  DatabaseUsage,
  DatabaseLicense,
  DatabasePaymentNotification,
  SupabaseUsageResponse,
  SupabaseFeatureAccessResponse,
  SupabaseSubscriptionSummary,
  SupabasePaymentService,
  PaymentError,
  PaymentSyncError,
  License
} from '../types/payment-types'
import { licenseValidator } from './license-validator'

export class SupabasePaymentClient implements SupabasePaymentService {
  private supabase: SupabaseClient
  private userId: string | null = null

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    
    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.userId = session?.user?.id || null
    })
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.userId) {
      const { data: { user } } = await this.supabase.auth.getUser()
      this.userId = user?.id || null
    }

    if (!this.userId) {
      throw new Error('Authentication required')
    }

    return this.userId
  }

  private createPaymentError(message: string, code: string = 'FEATURE_NOT_AVAILABLE', originalError?: any): PaymentError {
    const error = new Error(message) as PaymentError
    error.code = code as any
    error.details = originalError
    error.userMessage = message
    return error
  }

  // Subscription queries
  async getSubscription(userId?: string): Promise<DatabaseSubscription | null> {
    const targetUserId = userId || await this.ensureAuthenticated()
    
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null
      }
      throw new Error(`Failed to get subscription: ${error.message}`)
    }

    return data
  }

  async getSubscriptionSummary(): Promise<SupabaseSubscriptionSummary> {
    await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .rpc('get_subscription_summary')

    if (error) {
      throw new Error(`Failed to get subscription summary: ${error.message}`)
    }

    return data
  }

  // Usage tracking
  async incrementUsage(featureId: string, amount: number = 1): Promise<SupabaseUsageResponse> {
    await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .rpc('increment_usage', {
        feature_id: featureId,
        usage_amount: amount
      })

    if (error) {
      // Handle specific usage limit errors
      if (error.message.includes('Usage limit exceeded')) {
        const limitError = this.createPaymentError(
          `You have reached your monthly limit for ${featureId}. Upgrade to continue using this feature.`,
          'USAGE_LIMIT_EXCEEDED',
          error
        )
        throw limitError
      }

      if (error.message.includes('No active subscription')) {
        const subscriptionError = this.createPaymentError(
          'Active subscription required to use this feature.',
          'SUBSCRIPTION_NOT_FOUND',
          error
        )
        throw subscriptionError
      }

      throw new Error(`Failed to increment usage: ${error.message}`)
    }

    return data
  }

  async getCurrentUsage(userId?: string, monthYear?: string): Promise<DatabaseUsage | null> {
    const targetUserId = userId || await this.ensureAuthenticated()
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7)

    const { data, error } = await this.supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('month_year', targetMonth)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null
      }
      throw new Error(`Failed to get usage: ${error.message}`)
    }

    return data
  }

  // Feature access
  async checkFeatureAccess(featureId: string): Promise<SupabaseFeatureAccessResponse> {
    await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .rpc('check_feature_access', {
        feature_id: featureId
      })

    if (error) {
      console.warn(`Feature access check failed for ${featureId}:`, error)
      // Return safe default (no access) instead of throwing
      return {
        has_access: false,
        requires_upgrade: true,
        error: error.message
      }
    }

    return data
  }

  // Convenience method for common feature access pattern
  async requireFeatureAccess(featureId: string): Promise<void> {
    const access = await this.checkFeatureAccess(featureId)
    
    if (!access.has_access) {
      let errorMessage = `Feature "${featureId}" requires a premium subscription`
      let errorCode = 'FEATURE_NOT_AVAILABLE'

      if (access.usage_limit_reached) {
        errorMessage = `You have reached your monthly limit for ${featureId}. Your limit will reset soon.`
        errorCode = 'USAGE_LIMIT_EXCEEDED'
      } else if (access.requires_upgrade) {
        errorMessage = `Feature "${featureId}" is not available in your current plan. Please upgrade to access this feature.`
      }

      const error = this.createPaymentError(errorMessage, errorCode)
      throw error
    }
  }

  // License management
  async getLicense(userId?: string): Promise<DatabaseLicense | null> {
    const targetUserId = userId || await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .from('user_licenses')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null
      }
      throw new Error(`Failed to get license: ${error.message}`)
    }

    return data
  }

  async validateLicense(token: string): Promise<boolean> {
    try {
      // Use the existing license validator for JWT validation
      const validation = await licenseValidator.validateLicense({ signature: token } as any)
      return validation.isValid
    } catch (error) {
      console.error('License validation failed:', error)
      return false
    }
  }

  // Notifications
  async getNotifications(userId?: string): Promise<DatabasePaymentNotification[]> {
    const targetUserId = userId || await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .from('payment_notifications')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get notifications: ${error.message}`)
    }

    return data || []
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.ensureAuthenticated()

    const { error } = await this.supabase
      .from('payment_notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }

  // Activity logging
  async logActivity(action: string, featureId?: string, metadata?: Record<string, any>): Promise<void> {
    await this.ensureAuthenticated()

    const { error } = await this.supabase
      .from('user_activity_log')
      .insert({
        action,
        feature_id: featureId || null,
        metadata: metadata || {}
      })

    if (error) {
      // Don't throw error for activity logging failures - just log it
      console.warn('Failed to log activity:', error)
    }
  }

  // Helper methods for common operations
  async canUseFeature(featureId: string): Promise<boolean> {
    try {
      const access = await this.checkFeatureAccess(featureId)
      return access.has_access
    } catch (error) {
      console.warn(`Failed to check feature access for ${featureId}:`, error)
      return false
    }
  }

  async getUsageRemaining(featureId: string): Promise<number> {
    try {
      const access = await this.checkFeatureAccess(featureId)
      return access.remaining || 0
    } catch (error) {
      console.warn(`Failed to get usage remaining for ${featureId}:`, error)
      return 0
    }
  }

  async isSubscriptionActive(): Promise<boolean> {
    try {
      const subscription = await this.getSubscription()
      return subscription?.status === 'active' || subscription?.status === 'trialing'
    } catch (error) {
      console.warn('Failed to check subscription status:', error)
      return false
    }
  }

  // Sync error handling with retry logic
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry certain errors
        if (error instanceof Error && (
          error.message.includes('Authentication') ||
          error.message.includes('Usage limit exceeded') ||
          error.message.includes('Feature not available')
        )) {
          throw error
        }

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Create sync error for final failure
    const syncError: PaymentSyncError = new Error(
      `${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`
    ) as PaymentSyncError

    syncError.code = 'NETWORK_ERROR'
    syncError.retryable = true
    syncError.context = {
      operation: operationName,
      userId: this.userId || 'unknown',
      attemptCount: maxRetries
    }

    throw syncError
  }

  // Batch operations for efficiency
  async trackMultipleUsage(usageItems: Array<{ featureId: string, amount: number }>): Promise<void> {
    await this.ensureAuthenticated()

    // Process items sequentially to maintain usage counts
    for (const item of usageItems) {
      try {
        await this.incrementUsage(item.featureId, item.amount)
      } catch (error) {
        // Log error but continue with other items
        console.warn(`Failed to track usage for ${item.featureId}:`, error)
      }
    }
  }

  // Clean up methods
  async cleanup(): Promise<void> {
    // Clean up any subscriptions or listeners
    // Currently no cleanup needed for this implementation
  }
}

// Default instance that can be imported
let defaultPaymentClient: SupabasePaymentClient | null = null

export const getSupabasePaymentClient = (): SupabasePaymentClient => {
  if (!defaultPaymentClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured')
    }

    defaultPaymentClient = new SupabasePaymentClient(supabaseUrl, supabaseKey)
  }

  return defaultPaymentClient
}

// Export the default instance
export const supabasePaymentService = getSupabasePaymentClient()