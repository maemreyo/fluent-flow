// Supabase Payment Service - Handles payment features via Supabase RPC functions
// Uses centralized Supabase client to avoid multiple instance conflicts

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import type {
  DatabaseLicense,
  DatabasePaymentNotification,
  DatabaseSubscription,
  PaymentError,
  PaymentErrorCode,
  SupabaseFeatureAccessResponse,
  SupabasePaymentService,
  SupabaseSubscriptionSummary,
  SupabaseUsageResponse
} from '../types/payment-types'

export class SupabasePaymentClient implements SupabasePaymentService {
  private supabase: SupabaseClient
  private userId: string | null = null

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.userId = session?.user?.id || null
    })

    // Initialize current user
    this.initializeUser()
  }

  private async initializeUser() {
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser()
      this.userId = user?.id || null
    } catch (error) {
      console.debug('Failed to initialize user in payment service:', error)
    }
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.userId) {
      const {
        data: { user }
      } = await this.supabase.auth.getUser()
      this.userId = user?.id || null
    }

    if (!this.userId) {
      throw new Error('Authentication required')
    }

    return this.userId
  }

  private createPaymentError(
    message: string,
    code: PaymentErrorCode = 'FEATURE_NOT_AVAILABLE',
    originalError?: any
  ): PaymentError {
    const error = new Error(message) as PaymentError
    error.code = code
    error.originalError = originalError
    return error
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new Error('Max retries exceeded')
  }

  async getSubscription(): Promise<DatabaseSubscription | null> {
    const userId = await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw this.createPaymentError(
        'Failed to fetch subscription',
        'SUBSCRIPTION_FETCH_ERROR',
        error
      )
    }

    return data || null
  }

  async getSubscriptionSummary(): Promise<SupabaseSubscriptionSummary> {
    await this.ensureAuthenticated() // Just to ensure user is authenticated

    const { data, error } = await this.supabase.rpc('get_subscription_summary') // No parameters needed

    if (error) {
      throw this.createPaymentError('Failed to get subscription summary', 'RPC_ERROR', error)
    }

    return data as SupabaseSubscriptionSummary
  }

  async incrementUsage(featureId: string, amount = 1): Promise<SupabaseUsageResponse> {
    await this.ensureAuthenticated() // Just to ensure user is authenticated

    return this.retryWithBackoff(async () => {
      const { data, error } = await this.supabase.rpc('increment_usage', {
        // Fixed function name
        feature_id: featureId, // Fixed parameter name
        usage_amount: amount, // Fixed parameter name
        current_month: null // Let function use default (current month)
      })

      if (error) {
        throw this.createPaymentError(
          `Failed to increment usage for ${featureId}`,
          'USAGE_UPDATE_ERROR',
          error
        )
      }

      return data as SupabaseUsageResponse
    })
  }

  async getCurrentUsage(featureId: string): Promise<SupabaseUsageResponse> {
    // Use checkFeatureAccess which returns usage info
    const accessResponse = await this.checkFeatureAccess(featureId)

    // Convert to SupabaseUsageResponse format
    return {
      success: accessResponse.has_access,
      feature_id: featureId,
      current_usage: accessResponse.current_usage || 0,
      limit: accessResponse.limit || -1,
      remaining: accessResponse.remaining || -1,
      all_usage: {} // Would need separate call to get all usage
    } as SupabaseUsageResponse
  }

  async checkFeatureAccess(featureId: string): Promise<SupabaseFeatureAccessResponse> {
    await this.ensureAuthenticated() // Just to ensure user is authenticated

    const { data, error } = await this.supabase.rpc('check_feature_access', {
      feature_id: featureId // Fixed parameter name
    })

    if (error) {
      throw this.createPaymentError(
        `Failed to check access for ${featureId}`,
        'ACCESS_CHECK_ERROR',
        error
      )
    }

    return data as SupabaseFeatureAccessResponse
  }

  async requireFeatureAccess(featureId: string): Promise<void> {
    const access = await this.checkFeatureAccess(featureId)

    if (!access.has_access) {
      throw this.createPaymentError(
        `Feature ${featureId} requires premium subscription`,
        'FEATURE_NOT_AVAILABLE'
      )
    }

    if (access.usage_limit_reached) {
      throw this.createPaymentError(`Usage limit reached for ${featureId}`, 'USAGE_LIMIT_EXCEEDED')
    }
  }

  async logActivity(
    activityType: string,
    featureId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const userId = await this.ensureAuthenticated()

    const { error } = await this.supabase.from('user_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      feature_id: featureId,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    })

    if (error) {
      console.warn('Failed to log activity:', error)
    }
  }

  async getLicense(): Promise<DatabaseLicense | null> {
    const userId = await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .from('user_licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw this.createPaymentError('Failed to fetch license', 'LICENSE_FETCH_ERROR', error)
    }

    return data || null
  }

  async refreshLicense(): Promise<DatabaseLicense> {
    const userId = await this.ensureAuthenticated()

    // Fallback: Return mock license data since RPC function doesn't exist yet
    // TODO: Implement proper license refresh once migration is deployed
    const mockLicense: DatabaseLicense = {
      id: crypto.randomUUID(),
      user_id: userId,
      // @ts-ignore
      license_data: {
        plan_id: 'free',
        features: ['basic_loops'],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      is_active: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.warn('Using fallback license data - deploy migration for full functionality')
    return mockLicense
  }

  async syncPaymentData(subscription: any): Promise<void> {
    await this.ensureAuthenticated()

    // Fallback: Just log the sync request since RPC function doesn't exist yet
    // TODO: Implement proper sync once migration is deployed
    console.warn('Sync payment data requested but migration not deployed yet')
    console.debug('Subscription data to sync:', subscription)

    // For now, just succeed silently to avoid breaking the app
    return Promise.resolve()
  }

  async getNotifications(limit = 10): Promise<DatabasePaymentNotification[]> {
    const userId = await this.ensureAuthenticated()

    const { data, error } = await this.supabase
      .from('payment_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw this.createPaymentError(
        'Failed to fetch notifications',
        'NOTIFICATIONS_FETCH_ERROR',
        error
      )
    }

    return data || []
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const userId = await this.ensureAuthenticated()

    const { error } = await this.supabase
      .from('payment_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.warn('Failed to mark notification as read:', error)
    }
  }
}

// Default instance that can be imported
let defaultPaymentClient: SupabasePaymentClient | null = null

export const getSupabasePaymentClient = (): SupabasePaymentClient => {
  if (!defaultPaymentClient) {
    // Use the centralized supabase client
    defaultPaymentClient = new SupabasePaymentClient(supabase)
  }

  return defaultPaymentClient
}

// Export the default instance
export const supabasePaymentService = getSupabasePaymentClient()
