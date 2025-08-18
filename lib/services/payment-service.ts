// Payment Service - Handles all monetization and subscription logic
// API Proxy approach for secure payment processing

import { ImprovedBaseService } from './improved-base-service'
import { Storage } from '@plasmohq/storage'
import { v4 as uuidv4 } from 'uuid'
import { jwtDecode } from 'jwt-decode'
import type {
  User,
  Subscription,
  SubscriptionPlan,
  Usage,
  License,
  FeatureAccess,
  PaymentMethod,
  Invoice,
  BillingSettings,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  ValidateLicenseRequest,
  ValidateLicenseResponse,
  GetUsageRequest,
  GetUsageResponse,
  CheckFeatureAccessRequest,
  CheckFeatureAccessResponse,
  PaymentError,
  PaymentErrorCode
} from '../types/payment-types'

export class PaymentService extends ImprovedBaseService {
  private storage: Storage
  private apiKey: string | null = null
  declare protected baseUrl: string

  constructor(config: {
    apiKey?: string
    baseUrl: string // Your backend API
  }) {
    super(config.baseUrl)
    this.storage = new Storage()
    this.apiKey = config.apiKey || null
    this.baseUrl = config.baseUrl

    // Set up authentication if API key is provided
    if (this.apiKey) {
      this.setApiKey(this.apiKey, 'Authorization')
    }
  }

  // Authentication & User Management
  async authenticateUser(email: string, password?: string): Promise<User> {
    try {
      const response = await this.post<{
        user: User
        token: string
        refreshToken: string
      }>('/auth/login', {
        email,
        password,
        extensionId: chrome.runtime.id
      })

      // Store authentication tokens
      await this.storage.set('auth_token', response.token)
      await this.storage.set('refresh_token', response.refreshToken)
      await this.storage.set('user', response.user)

      // Update API client with auth token
      this.setAuthToken(response.token)

      return response.user
    } catch (error) {
      throw this.createPaymentError('USER_NOT_FOUND', 'Authentication failed', error)
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const cachedUser = await this.storage.get('user')
      if (cachedUser) {
        // Validate token is still valid
        const token = await this.storage.get('auth_token')
        if (token && !this.isTokenExpired(token)) {
          return cachedUser as unknown as User
        }
      }

      // Refresh user data from API
      const response = await this.get<{ user: User }>('/auth/me')
      await this.storage.set('user', response.user)
      return response.user
    } catch (error) {
      await this.clearAuthData()
      return null
    }
  }

  async logoutUser(): Promise<void> {
    try {
      await this.post('/auth/logout', {})
    } catch (error) {
      // Continue logout even if API call fails
    } finally {
      await this.clearAuthData()
    }
  }

  // Subscription Management
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await this.get<{ plans: SubscriptionPlan[] }>('/plans')
      return response.plans
    } catch (error) {
      throw this.createPaymentError('PLAN_NOT_FOUND', 'Failed to load plans', error)
    }
  }

  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const response = await this.get<{ subscription: Subscription | null }>('/subscriptions/current')
      
      if (response.subscription) {
        await this.storage.set('subscription', response.subscription)
      }
      
      return response.subscription
    } catch (error) {
      return null
    }
  }

  async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
    try {
      const response = await this.post<CreateCheckoutSessionResponse>('/checkout/create-session', {
        ...request,
        userId: (await this.getCurrentUser())?.id,
        extensionId: chrome.runtime.id
      })

      return response
    } catch (error) {
      throw this.createPaymentError('PAYMENT_REQUIRED', 'Failed to create checkout session', error)
    }
  }

  async createPortalSession(request: CreatePortalSessionRequest): Promise<CreatePortalSessionResponse> {
    try {
      const response = await this.post<CreatePortalSessionResponse>('/billing/create-portal-session', {
        ...request,
        userId: (await this.getCurrentUser())?.id
      })

      return response
    } catch (error) {
      throw this.createPaymentError('SUBSCRIPTION_NOT_FOUND', 'Failed to access billing portal', error)
    }
  }

  async cancelSubscription(): Promise<Subscription> {
    try {
      const response = await this.post<{ subscription: Subscription }>('/subscriptions/cancel', {})
      await this.storage.set('subscription', response.subscription)
      return response.subscription
    } catch (error) {
      throw this.createPaymentError('SUBSCRIPTION_NOT_FOUND', 'Failed to cancel subscription', error)
    }
  }

  async reactivateSubscription(): Promise<Subscription> {
    try {
      const response = await this.post<{ subscription: Subscription }>('/subscriptions/reactivate', {})
      await this.storage.set('subscription', response.subscription)
      return response.subscription
    } catch (error) {
      throw this.createPaymentError('SUBSCRIPTION_NOT_FOUND', 'Failed to reactivate subscription', error)
    }
  }

  // Usage & Limits
  async getCurrentUsage(): Promise<Usage> {
    try {
      const request: GetUsageRequest = {
        userId: (await this.getCurrentUser())?.id || '',
        period: new Date().toISOString().slice(0, 7) // Current month YYYY-MM
      }

      const response = await this.post<GetUsageResponse>('/usage/current', request)
      await this.storage.set('usage', response.usage)
      return response.usage
    } catch (error) {
      throw this.createPaymentError('USER_NOT_FOUND', 'Failed to get usage data', error)
    }
  }

  async checkFeatureAccess(featureId: string): Promise<FeatureAccess> {
    try {
      const request: CheckFeatureAccessRequest = {
        userId: (await this.getCurrentUser())?.id || '',
        featureId
      }

      const response = await this.post<CheckFeatureAccessResponse>('/features/check-access', request)
      
      return {
        featureId,
        hasAccess: response.hasAccess,
        limit: response.limit,
        used: response.used,
        resetDate: response.resetDate,
        requiresUpgrade: response.requiresUpgrade
      }
    } catch (error) {
      // Default to no access on error
      return {
        featureId,
        hasAccess: false,
        requiresUpgrade: true
      }
    }
  }

  async incrementUsage(featureId: string, amount: number = 1): Promise<Usage> {
    try {
      const response = await this.post<{ usage: Usage }>('/usage/increment', {
        userId: (await this.getCurrentUser())?.id,
        featureId,
        amount
      })

      await this.storage.set('usage', response.usage)
      return response.usage
    } catch (error) {
      throw this.createPaymentError('USAGE_LIMIT_EXCEEDED', 'Usage limit exceeded', error)
    }
  }

  // License Validation (for offline functionality)
  async validateLicense(): Promise<License | null> {
    try {
      const cachedLicense = await this.storage.get('license')
      
      if (cachedLicense && this.isLicenseValid(cachedLicense as unknown as License)) {
        return cachedLicense as unknown as License
      }

      // Fetch fresh license from API
      const response = await this.get<{ license: License }>('/license/current')
      
      if (response.license && this.isLicenseValid(response.license)) {
        await this.storage.set('license', response.license)
        return response.license
      }

      return null
    } catch (error) {
      return null
    }
  }

  async refreshLicense(): Promise<License | null> {
    try {
      const response = await this.post<{ license: License }>('/license/refresh', {
        userId: (await this.getCurrentUser())?.id
      })

      if (response.license) {
        await this.storage.set('license', response.license)
        return response.license
      }

      return null
    } catch (error) {
      return null
    }
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await this.get<{ paymentMethods: PaymentMethod[] }>('/payment-methods')
      return response.paymentMethods
    } catch (error) {
      return []
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.delete(`/payment-methods/${paymentMethodId}`)
    } catch (error) {
      throw this.createPaymentError('PAYMENT_REQUIRED', 'Failed to delete payment method', error)
    }
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await this.get<{ invoices: Invoice[] }>('/invoices')
      return response.invoices
    } catch (error) {
      return []
    }
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    try {
      return await this.downloadFile(`/invoices/${invoiceId}/download`)
    } catch (error) {
      throw this.createPaymentError('SUBSCRIPTION_NOT_FOUND', 'Failed to download invoice', error)
    }
  }

  // Billing Settings
  async getBillingSettings(): Promise<BillingSettings | null> {
    try {
      const response = await this.get<{ settings: BillingSettings }>('/billing/settings')
      return response.settings
    } catch (error) {
      return null
    }
  }

  async updateBillingSettings(settings: Partial<BillingSettings>): Promise<BillingSettings> {
    try {
      const response = await this.put<{ settings: BillingSettings }>('/billing/settings', settings)
      return response.settings
    } catch (error) {
      throw this.createPaymentError('USER_NOT_FOUND', 'Failed to update billing settings', error)
    }
  }

  // Helper Methods
  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token)
      return Date.now() >= decoded.exp * 1000
    } catch {
      return true
    }
  }

  private isLicenseValid(license: License): boolean {
    try {
      if (!license.signature) return false
      
      const decoded: any = jwtDecode(license.signature)
      const now = Date.now()
      
      return (
        license.isValid &&
        license.expiresAt > now &&
        decoded.exp * 1000 > now
      )
    } catch {
      return false
    }
  }

  private async clearAuthData(): Promise<void> {
    await Promise.all([
      this.storage.remove('auth_token'),
      this.storage.remove('refresh_token'),
      this.storage.remove('user'),
      this.storage.remove('subscription'),
      this.storage.remove('license'),
      this.storage.remove('usage')
    ])
  }

  private createPaymentError(code: PaymentErrorCode, message: string, originalError?: any): PaymentError {
    const error = new Error(message) as PaymentError
    error.code = code
    error.details = originalError
    
    // User-friendly messages
    const userMessages: Record<PaymentErrorCode, string> = {
      CARD_DECLINED: 'Your payment method was declined. Please try a different card.',
      INSUFFICIENT_FUNDS: 'Insufficient funds. Please check your payment method.',
      SUBSCRIPTION_NOT_FOUND: 'No active subscription found.',
      PLAN_NOT_FOUND: 'The selected plan is no longer available.',
      USER_NOT_FOUND: 'User authentication required.',
      INVALID_COUPON: 'The coupon code is invalid or expired.',
      USAGE_LIMIT_EXCEEDED: 'You have reached your usage limit. Please upgrade your plan.',
      FEATURE_NOT_AVAILABLE: 'This feature is not available in your current plan.',
      LICENSE_INVALID: 'Your license is invalid. Please contact support.',
      LICENSE_EXPIRED: 'Your license has expired. Please renew your subscription.',
      PAYMENT_REQUIRED: 'Payment is required to continue using this feature.'
    }

    error.userMessage = userMessages[code] || message
    return error
  }

  // Public API for feature gates
  async canUseFeature(featureId: string): Promise<boolean> {
    const access = await this.checkFeatureAccess(featureId)
    return access.hasAccess
  }

  async requireFeature(featureId: string): Promise<void> {
    const access = await this.checkFeatureAccess(featureId)
    if (!access.hasAccess) {
      throw this.createPaymentError(
        'FEATURE_NOT_AVAILABLE',
        `Feature "${featureId}" requires a premium subscription`
      )
    }
  }

  // Usage tracking for AI features
  async trackAIUsage(provider: string, model: string, tokensUsed: number): Promise<void> {
    try {
      await this.post('/usage/track-ai', {
        userId: (await this.getCurrentUser())?.id,
        provider,
        model,
        tokensUsed,
        timestamp: Date.now()
      })
    } catch (error) {
      // Don't throw errors for usage tracking
      console.warn('Failed to track AI usage:', error)
    }
  }
}