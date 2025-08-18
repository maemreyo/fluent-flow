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