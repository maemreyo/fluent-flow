// Payment & Subscription Types
// Comprehensive type definitions for monetization features

export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  createdAt: number
  lastLoginAt: number
  stripeCustomerId?: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  displayName: string
  description: string
  priceMonthly: number
  priceYearly: number
  stripePriceMonthlyId: string
  stripePriceYearlyId: string
  features: PlanFeature[]
  limits: PlanLimits
  popular?: boolean
  trialDays?: number
}

export interface PlanFeature {
  id: string
  name: string
  description: string
  included: boolean
  limit?: number
}

export interface PlanLimits {
  aiRequests: number // -1 for unlimited
  conversations: number
  historyRetention: number // days
  fileUploads: number
  customPrompts: number
  prioritySupport: boolean
  advancedFeatures: string[]
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  stripeSubscriptionId: string
  status: SubscriptionStatus
  currentPeriodStart: number
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  trialEnd?: number
  createdAt: number
  updatedAt: number
}

export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'past_due' 
  | 'trialing' 
  | 'unpaid'

export interface Usage {
  userId: string
  period: string // YYYY-MM format
  aiRequests: number
  conversations: number
  tokensUsed: number
  features: Record<string, number>
  lastUpdated: number
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank_account'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

export interface Invoice {
  id: string
  subscriptionId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void'
  createdAt: number
  paidAt?: number
  dueDate: number
  downloadUrl?: string
}

export interface License {
  userId: string
  planId: string
  isValid: boolean
  expiresAt: number
  features: string[]
  limits: PlanLimits
  signature: string // JWT token for validation
}

export interface PaymentEvent {
  id: string
  type: PaymentEventType
  userId: string
  subscriptionId?: string
  planId?: string
  amount?: number
  currency?: string
  status: 'pending' | 'completed' | 'failed'
  metadata?: Record<string, any>
  createdAt: number
}

export type PaymentEventType = 
  | 'subscription_created'
  | 'subscription_updated' 
  | 'subscription_canceled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'trial_ended'
  | 'invoice_created'
  | 'customer_updated'

export interface FeatureAccess {
  featureId: string
  hasAccess: boolean
  limit?: number
  used?: number
  resetDate?: number
  requiresUpgrade?: boolean
}

export interface BillingSettings {
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY'
  taxId?: string
  billingAddress?: {
    line1: string
    line2?: string
    city: string
    state?: string
    postalCode: string
    country: string
  }
  autoRenew: boolean
  invoiceEmails: boolean
}

// API Request/Response types
export interface CreateCheckoutSessionRequest {
  planId: string
  billingPeriod: 'monthly' | 'yearly'
  successUrl: string
  cancelUrl: string
  couponCode?: string
}

export interface CreateCheckoutSessionResponse {
  sessionId: string
  url: string
}

export interface CreatePortalSessionRequest {
  returnUrl: string
}

export interface CreatePortalSessionResponse {
  url: string
}

export interface ValidateLicenseRequest {
  userId: string
  signature: string
}

export interface ValidateLicenseResponse {
  isValid: boolean
  license?: License
  error?: string
}

export interface GetUsageRequest {
  userId: string
  period?: string
}

export interface GetUsageResponse {
  usage: Usage
  limits: PlanLimits
  features: FeatureAccess[]
}

export interface CheckFeatureAccessRequest {
  userId: string
  featureId: string
}

export interface CheckFeatureAccessResponse {
  hasAccess: boolean
  limit?: number
  used?: number
  resetDate?: number
  requiresUpgrade?: boolean
  upgradeUrl?: string
}

// Store types
export interface PaymentStore {
  // User & Auth
  user: User | null
  isAuthenticated: boolean
  
  // Subscription
  subscription: Subscription | null
  plan: SubscriptionPlan | null
  availablePlans: SubscriptionPlan[]
  
  // Usage & Limits
  usage: Usage | null
  featureAccess: Record<string, FeatureAccess>
  
  // Payment
  paymentMethods: PaymentMethod[]
  invoices: Invoice[]
  billingSettings: BillingSettings | null
  
  // UI State
  isLoading: boolean
  showUpgradeModal: boolean
  showBillingModal: boolean
  error: string | null
}

// Feature flags based on subscription
export interface FeatureFlags {
  hasUnlimitedAI: boolean
  hasAdvancedFeatures: boolean
  hasPrioritySupport: boolean
  hasCustomPrompts: boolean
  hasFileUploads: boolean
  hasAnalytics: boolean
  hasTeamFeatures: boolean
  hasWhiteLabel: boolean
}

// Coupon/Discount types
export interface Coupon {
  id: string
  code: string
  name: string
  percentOff?: number
  amountOff?: number
  currency?: string
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths?: number
  maxRedemptions?: number
  redeemBy?: number
  validForPlans?: string[]
  isActive: boolean
}

// Analytics types
export interface PaymentAnalytics {
  revenue: {
    monthly: number
    yearly: number
    total: number
  }
  subscriptions: {
    active: number
    canceled: number
    churned: number
    trial: number
  }
  plans: Record<string, {
    subscribers: number
    revenue: number
    churnRate: number
  }>
  conversion: {
    trialToSubscription: number
    freeToTrial: number
    upgradeRate: number
  }
}

// Webhook types
export interface StripeWebhookEvent {
  id: string
  object: 'event'
  type: string
  data: {
    object: any
    previous_attributes?: any
  }
  created: number
  livemode: boolean
  pending_webhooks: number
  request?: {
    id: string
    idempotency_key?: string
  }
}

// Error types
export interface PaymentError extends Error {
  code: PaymentErrorCode
  details?: any
  userMessage?: string
  originalError?: any
}

export type PaymentErrorCode = 
  | 'CARD_DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'PLAN_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'INVALID_COUPON'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'FEATURE_NOT_AVAILABLE'
  | 'LICENSE_INVALID'
  | 'LICENSE_EXPIRED'
  | 'PAYMENT_REQUIRED'
  | 'SUBSCRIPTION_FETCH_ERROR'
  | 'RPC_ERROR'
  | 'USAGE_UPDATE_ERROR'
  | 'USAGE_FETCH_ERROR'
  | 'ACCESS_CHECK_ERROR'
  | 'LICENSE_FETCH_ERROR'
  | 'LICENSE_REFRESH_ERROR'
  | 'NOTIFICATIONS_FETCH_ERROR'

// =============================================================================
// SUPABASE INTEGRATION TYPES
// =============================================================================

// Supabase database types (matches schema migration)
export interface DatabaseSubscription {
  id: string
  user_id: string
  plan_id: string
  plan_name: string
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  trial_start: string | null
  trial_end: string | null
  canceled_at: string | null
  features: Record<string, boolean>
  limits: Record<string, number>
  external_subscription_id: string | null
  external_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseUsage {
  id: string
  user_id: string
  month_year: string
  loops_created: number
  ai_requests_made: number
  export_operations: number
  file_uploads: number
  custom_prompts_used: number
  features_accessed: Record<string, number>
  last_reset_at: string
  created_at: string
  updated_at: string
}

export interface DatabaseLicense {
  id: string
  user_id: string
  license_token: string
  expires_at: string
  issued_at: string
  features: Record<string, boolean>
  limits: Record<string, number>
  is_active: boolean
  last_validated_at: string
  validation_count: number
  created_at: string
}

export interface DatabasePaymentNotification {
  id: string
  user_id: string
  type: PaymentNotificationType
  title: string
  message: string
  data: Record<string, any>
  read: boolean
  expires_at: string | null
  created_at: string
}

export type PaymentNotificationType =
  | 'trial_ending'
  | 'trial_ended'
  | 'subscription_canceled'
  | 'payment_failed'
  | 'usage_limit_warning'
  | 'usage_limit_reached'
  | 'feature_upgrade_available'
  | 'subscription_renewed'
  | 'plan_changed'

export interface DatabaseUserActivity {
  id: string
  user_id: string
  action: string
  feature_id: string | null
  metadata: Record<string, any>
  created_at: string
}

// RPC function response types
export interface SupabaseUsageResponse {
  success: boolean
  feature_id: string
  current_usage: number
  limit: number
  remaining: number
  all_usage: Record<string, number>
}

export interface SupabaseFeatureAccessResponse {
  has_access: boolean
  feature_id?: string
  current_usage?: number
  limit?: number
  remaining?: number
  plan_id?: string
  requires_upgrade?: boolean
  usage_limit_reached?: boolean
  error?: string
}

export interface SupabaseSubscriptionSummary {
  subscription: DatabaseSubscription | null
  current_usage: DatabaseUsage | null
  month: string
}

// Supabase service interface
export interface SupabasePaymentService {
  // Subscription queries
  getSubscription(): Promise<DatabaseSubscription | null>
  getSubscriptionSummary(): Promise<SupabaseSubscriptionSummary>
  
  // Usage tracking
  incrementUsage(featureId: string, amount?: number): Promise<SupabaseUsageResponse>
  getCurrentUsage(featureId: string): Promise<SupabaseUsageResponse>
  
  // Feature access
  checkFeatureAccess(featureId: string): Promise<SupabaseFeatureAccessResponse>
  requireFeatureAccess(featureId: string): Promise<void>
  
  // License management
  getLicense(): Promise<DatabaseLicense | null>
  refreshLicense(): Promise<DatabaseLicense>
  
  // Data sync
  syncPaymentData(subscription: any): Promise<void>
  
  // Notifications
  getNotifications(limit?: number): Promise<DatabasePaymentNotification[]>
  markNotificationRead(notificationId: string): Promise<void>
  
  // Activity logging
  logActivity(activityType: string, featureId: string, metadata?: Record<string, any>): Promise<void>
}

// Feature gate configuration
export interface FeatureGateConfig {
  featureId: string
  planRequired: 'free' | 'starter' | 'pro'
  usageLimit?: number
  resetPeriod?: 'monthly' | 'yearly' | 'never'
  gracePeriod?: number // days after limit reached
  upgradePrompt: {
    title: string
    message: string
    ctaText: string
    ctaUrl: string
  }
}

// Plan configuration
export interface PlanConfiguration {
  id: 'free' | 'starter' | 'pro'
  name: string
  displayName: string
  description: string
  pricing: {
    monthly: number
    yearly: number
    stripePriceIds: {
      monthly: string
      yearly: string
    }
  }
  features: Record<string, boolean>
  limits: {
    loops_per_month: number
    ai_requests_per_month: number
    file_uploads_per_month: number
    custom_prompts_per_month: number
    export_operations_per_month: number
  }
  trial: {
    enabled: boolean
    days: number
  }
}

// Usage tracking configuration
export interface UsageTrackingConfig {
  enabled: boolean
  batchSize: number
  syncInterval: number // milliseconds
  offlineBuffer: number // max items to buffer offline
  retryAttempts: number
}

// Layout and UI context types
export interface PaymentUIContext {
  layoutMode: 'sidepanel' | 'options'
  compactMode: boolean
  showDetailedUsage: boolean
  showUpgradePrompts: boolean
}

export interface CompactPaymentStatus {
  planName: string
  isActive: boolean
  daysRemaining?: number
  usageWarnings: string[]
  requiresAttention: boolean
}

// Webhook sync types (for backend API)
export interface WebhookSyncPayload {
  userId: string
  subscriptionData: {
    id: string
    status: SubscriptionStatus
    planId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    trialEnd?: number
    canceledAt?: number
  }
  licenseUpdate: boolean
  notifyUser: boolean
}

// Error handling for offline/sync scenarios
export interface PaymentSyncError extends Error {
  code: PaymentSyncErrorCode
  retryable: boolean
  nextRetryAt?: number
  context?: {
    operation: string
    userId: string
    featureId?: string
    attemptCount: number
  }
}

export type PaymentSyncErrorCode =
  | 'NETWORK_ERROR'
  | 'SUPABASE_UNAVAILABLE'
  | 'PAYMENT_API_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'AUTHENTICATION_ERROR'
  | 'SYNC_CONFLICT'
  | 'VALIDATION_ERROR'

// Extension-specific types for Chrome extension context
export interface ExtensionPaymentState {
  isOnline: boolean
  lastSyncAt: number
  pendingUsageUpdates: Array<{
    featureId: string
    amount: number
    timestamp: number
  }>
  cachedLicense: DatabaseLicense | null
  offlineGracePeriod: number
}

// Integration with existing FluentFlow types
export interface FluentFlowPaymentIntegration {
  // Maps to existing loop/session types
  trackLoopCreation(): Promise<void>
  trackAIConversation(tokensUsed: number): Promise<void>
  trackExportOperation(format: 'json' | 'csv' | 'pdf'): Promise<void>
  
  // Feature gates for existing functionality
  canCreateLoop(): Promise<boolean>
  canUseAIFeatures(): Promise<boolean>
  canExportData(): Promise<boolean>
  canAccessAdvancedAnalytics(): Promise<boolean>
  
  // Upgrade prompts
  showUpgradeForFeature(featureId: string, context?: string): void
  redirectToUpgrade(planId?: string): void
}