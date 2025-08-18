// Payment Store - Zustand store for subscription and payment management
// Handles authentication, subscriptions, usage tracking, and billing

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { PaymentService } from '../services/payment-service'
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
  PaymentStore,
  FeatureFlags,
  PaymentError
} from '../types/payment-types'

interface PaymentState extends PaymentStore {
  // Actions
  // Authentication
  login: (email: string, password?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  
  // Subscription
  loadPlans: () => Promise<void>
  loadSubscription: () => Promise<void>
  createCheckout: (planId: string, billingPeriod: 'monthly' | 'yearly') => Promise<string>
  openBillingPortal: () => Promise<string>
  cancelSubscription: () => Promise<void>
  reactivateSubscription: () => Promise<void>
  
  // Usage & Features
  loadUsage: () => Promise<void>
  checkFeature: (featureId: string) => Promise<FeatureAccess>
  trackUsage: (featureId: string, amount?: number) => Promise<void>
  canUseFeature: (featureId: string) => boolean
  requireFeature: (featureId: string) => Promise<void>
  
  // License
  validateLicense: () => Promise<void>
  refreshLicense: () => Promise<void>
  
  // Payment Methods & Billing
  loadPaymentMethods: () => Promise<void>
  loadInvoices: () => Promise<void>
  loadBillingSettings: () => Promise<void>
  updateBillingSettings: (settings: Partial<BillingSettings>) => Promise<void>
  
  // UI Actions
  showUpgrade: (featureId?: string) => void
  hideUpgrade: () => void
  showBilling: () => void
  hideBilling: () => void
  clearError: () => void
  
  // Initialization
  initialize: (config: { apiKey?: string; baseUrl: string }) => Promise<void>
}

// Create payment service instance (will be initialized later)
let paymentService: PaymentService | null = null

export const usePaymentStore = create<PaymentState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        subscription: null,
        plan: null,
        availablePlans: [],
        usage: null,
        featureAccess: {},
        paymentMethods: [],
        invoices: [],
        billingSettings: null,
        isLoading: false,
        showUpgradeModal: false,
        showBillingModal: false,
        error: null,

        // Authentication actions
        login: async (email, password) => {
          if (!paymentService) throw new Error('Payment service not initialized')
          
          set({ isLoading: true, error: null })
          try {
            const user = await paymentService.authenticateUser(email, password)
            set({ 
              user, 
              isAuthenticated: true,
              isLoading: false 
            })
            
            // Load user data after authentication
            await Promise.all([
              get().loadSubscription(),
              get().loadUsage(),
              get().validateLicense()
            ])
          } catch (error: any) {
            set({ 
              error: error.userMessage || error.message,
              isLoading: false 
            })
            throw error
          }
        },

        logout: async () => {
          if (!paymentService) return
          
          set({ isLoading: true })
          try {
            await paymentService.logoutUser()
            set({
              user: null,
              isAuthenticated: false,
              subscription: null,
              plan: null,
              usage: null,
              featureAccess: {},
              paymentMethods: [],
              invoices: [],
              billingSettings: null,
              isLoading: false,
              error: null
            })
          } catch (error: any) {
            console.error('Logout error:', error)
            // Clear state anyway
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false
            })
          }
        },

        refreshUser: async () => {
          if (!paymentService) return
          
          try {
            const user = await paymentService.getCurrentUser()
            set({ 
              user,
              isAuthenticated: !!user
            })
          } catch (error) {
            console.error('Failed to refresh user:', error)
          }
        },

        // Subscription actions
        loadPlans: async () => {
          if (!paymentService) return
          
          try {
            const plans = await paymentService.getAvailablePlans()
            set({ availablePlans: plans })
          } catch (error: any) {
            set({ error: error.userMessage || error.message })
          }
        },

        loadSubscription: async () => {
          if (!paymentService) return
          
          try {
            const subscription = await paymentService.getCurrentSubscription()
            const currentPlan = subscription 
              ? get().availablePlans.find(p => p.id === subscription.planId)
              : null
            
            set({ 
              subscription,
              plan: currentPlan || null
            })
          } catch (error: any) {
            console.error('Failed to load subscription:', error)
          }
        },

        createCheckout: async (planId, billingPeriod) => {
          if (!paymentService) throw new Error('Payment service not initialized')
          
          set({ isLoading: true, error: null })
          try {
            const response = await paymentService.createCheckoutSession({
              planId,
              billingPeriod,
              successUrl: chrome.runtime.getURL('options.html?success=true'),
              cancelUrl: chrome.runtime.getURL('options.html?canceled=true')
            })
            
            set({ isLoading: false })
            return response.url
          } catch (error: any) {
            set({ 
              error: error.userMessage || error.message,
              isLoading: false 
            })
            throw error
          }
        },

        openBillingPortal: async () => {
          if (!paymentService) throw new Error('Payment service not initialized')
          
          set({ isLoading: true, error: null })
          try {
            const response = await paymentService.createPortalSession({
              returnUrl: chrome.runtime.getURL('options.html')
            })
            
            set({ isLoading: false })
            return response.url
          } catch (error: any) {
            set({ 
              error: error.userMessage || error.message,
              isLoading: false 
            })
            throw error
          }
        },

        cancelSubscription: async () => {
          if (!paymentService) throw new Error('Payment service not initialized')
          
          set({ isLoading: true, error: null })
          try {
            const subscription = await paymentService.cancelSubscription()
            set({ 
              subscription,
              isLoading: false 
            })
          } catch (error: any) {
            set({ 
              error: error.userMessage || error.message,
              isLoading: false 
            })
            throw error
          }
        },

        reactivateSubscription: async () => {
          if (!paymentService) throw new Error('Payment service not initialized')
          
          set({ isLoading: true, error: null })
          try {
            const subscription = await paymentService.reactivateSubscription()
            set({ 
              subscription,
              isLoading: false 
            })
          } catch (error: any) {
            set({ 
              error: error.userMessage || error.message,
              isLoading: false 
            })
            throw error
          }
        },

        // Usage & Features
        loadUsage: async () => {
          if (!paymentService) return
          
          try {
            const usage = await paymentService.getCurrentUsage()
            set({ usage })
          } catch (error) {
            console.error('Failed to load usage:', error)
          }
        },

        checkFeature: async (featureId) => {
          if (!paymentService) {
            return { featureId, hasAccess: false, requiresUpgrade: true }
          }
          
          try {
            const access = await paymentService.checkFeatureAccess(featureId)
            set((state) => ({
              featureAccess: {
                ...state.featureAccess,
                [featureId]: access
              }
            }))
            return access
          } catch (error) {
            const noAccess = { featureId, hasAccess: false, requiresUpgrade: true }
            set((state) => ({
              featureAccess: {
                ...state.featureAccess,
                [featureId]: noAccess
              }
            }))
            return noAccess
          }
        },

        trackUsage: async (featureId, amount = 1) => {
          if (!paymentService) return
          
          try {
            const usage = await paymentService.incrementUsage(featureId, amount)
            set({ usage })
          } catch (error: any) {
            // Handle usage limit exceeded
            if (error.code === 'USAGE_LIMIT_EXCEEDED') {
              set({ 
                error: error.userMessage,
                showUpgradeModal: true 
              })
            }
            throw error
          }
        },

        canUseFeature: (featureId) => {
          const access = get().featureAccess[featureId]
          return access?.hasAccess ?? false
        },

        requireFeature: async (featureId) => {
          const access = await get().checkFeature(featureId)
          if (!access.hasAccess) {
            set({ showUpgradeModal: true })
            const error = new Error(`Feature "${featureId}" requires a premium subscription`) as PaymentError
            error.code = 'FEATURE_NOT_AVAILABLE'
            error.userMessage = 'This feature requires a premium subscription'
            throw error
          }
        },

        // License
        validateLicense: async () => {
          if (!paymentService) return
          
          try {
            await paymentService.validateLicense()
          } catch (error) {
            console.error('License validation failed:', error)
          }
        },

        refreshLicense: async () => {
          if (!paymentService) return
          
          try {
            await paymentService.refreshLicense()
          } catch (error) {
            console.error('License refresh failed:', error)
          }
        },

        // Payment Methods & Billing
        loadPaymentMethods: async () => {
          if (!paymentService) return
          
          try {
            const paymentMethods = await paymentService.getPaymentMethods()
            set({ paymentMethods })
          } catch (error) {
            console.error('Failed to load payment methods:', error)
          }
        },

        loadInvoices: async () => {
          if (!paymentService) return
          
          try {
            const invoices = await paymentService.getInvoices()
            set({ invoices })
          } catch (error) {
            console.error('Failed to load invoices:', error)
          }
        },

        loadBillingSettings: async () => {
          if (!paymentService) return
          
          try {
            const billingSettings = await paymentService.getBillingSettings()
            set({ billingSettings })
          } catch (error) {
            console.error('Failed to load billing settings:', error)
          }
        },

        updateBillingSettings: async (settings) => {
          if (!paymentService) throw new Error('Payment service not initialized')
          
          set({ isLoading: true, error: null })
          try {
            const billingSettings = await paymentService.updateBillingSettings(settings)
            set({ 
              billingSettings,
              isLoading: false 
            })
          } catch (error: any) {
            set({ 
              error: error.userMessage || error.message,
              isLoading: false 
            })
            throw error
          }
        },

        // UI Actions
        showUpgrade: (featureId) => {
          set({ 
            showUpgradeModal: true,
            error: featureId ? `Feature "${featureId}" requires a premium subscription` : null
          })
        },

        hideUpgrade: () => {
          set({ showUpgradeModal: false, error: null })
        },

        showBilling: () => {
          set({ showBillingModal: true })
        },

        hideBilling: () => {
          set({ showBillingModal: false })
        },

        clearError: () => {
          set({ error: null })
        },

        // Initialization
        initialize: async (config) => {
          paymentService = new PaymentService(config)
          
          // Try to restore authentication state
          const user = await paymentService.getCurrentUser()
          if (user) {
            set({ 
              user,
              isAuthenticated: true 
            })
            
            // Load initial data
            await Promise.all([
              get().loadPlans(),
              get().loadSubscription(),
              get().loadUsage()
            ])
          } else {
            // Still load plans for unauthenticated users
            await get().loadPlans()
          }
        }
      }),
      {
        name: 'payment-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          subscription: state.subscription,
          plan: state.plan,
          usage: state.usage,
          showUpgradeModal: state.showUpgradeModal
        })
      }
    ),
    {
      name: 'payment-store'
    }
  )
)

// Selectors for optimized re-renders
export const useAuth = () => usePaymentStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error
}))

export const useSubscription = () => usePaymentStore((state) => ({
  subscription: state.subscription,
  plan: state.plan,
  availablePlans: state.availablePlans,
  isLoading: state.isLoading
}))

export const useUsage = () => usePaymentStore((state) => ({
  usage: state.usage,
  featureAccess: state.featureAccess,
  isLoading: state.isLoading
}))

export const useBilling = () => usePaymentStore((state) => ({
  paymentMethods: state.paymentMethods,
  invoices: state.invoices,
  billingSettings: state.billingSettings,
  isLoading: state.isLoading
}))

export const usePaymentUI = () => usePaymentStore((state) => ({
  showUpgradeModal: state.showUpgradeModal,
  showBillingModal: state.showBillingModal,
  error: state.error
}))

// Action hooks
export const usePaymentActions = () => usePaymentStore((state) => ({
  login: state.login,
  logout: state.logout,
  refreshUser: state.refreshUser,
  loadPlans: state.loadPlans,
  loadSubscription: state.loadSubscription,
  createCheckout: state.createCheckout,
  openBillingPortal: state.openBillingPortal,
  cancelSubscription: state.cancelSubscription,
  reactivateSubscription: state.reactivateSubscription,
  loadUsage: state.loadUsage,
  checkFeature: state.checkFeature,
  trackUsage: state.trackUsage,
  canUseFeature: state.canUseFeature,
  requireFeature: state.requireFeature,
  showUpgrade: state.showUpgrade,
  hideUpgrade: state.hideUpgrade,
  showBilling: state.showBilling,
  hideBilling: state.hideBilling,
  clearError: state.clearError,
  initialize: state.initialize
}))

// Helper hooks
export const useFeatureFlags = (): FeatureFlags => {
  return usePaymentStore((state) => {
    const plan = state.plan
    const subscription = state.subscription
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
    
    if (!plan || !isActive) {
      return {
        hasUnlimitedAI: false,
        hasAdvancedFeatures: false,
        hasPrioritySupport: false,
        hasCustomPrompts: false,
        hasFileUploads: false,
        hasAnalytics: false,
        hasTeamFeatures: false,
        hasWhiteLabel: false
      }
    }

    return {
      hasUnlimitedAI: plan.limits.aiRequests === -1,
      hasAdvancedFeatures: plan.limits.advancedFeatures.length > 0,
      hasPrioritySupport: plan.limits.prioritySupport,
      hasCustomPrompts: plan.limits.customPrompts > 0,
      hasFileUploads: plan.limits.fileUploads > 0,
      hasAnalytics: plan.limits.advancedFeatures.includes('analytics'),
      hasTeamFeatures: plan.limits.advancedFeatures.includes('team'),
      hasWhiteLabel: plan.limits.advancedFeatures.includes('whitelabel')
    }
  })
}

export const useCanUseFeature = (featureId: string) => {
  return usePaymentStore((state) => {
    const access = state.featureAccess[featureId]
    return access?.hasAccess ?? false
  })
}