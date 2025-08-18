// Feature Gates - Controls access to premium features
// Higher-order components and hooks for feature gating

import React from 'react'
import { usePaymentActions, usePaymentStore } from '../stores/payment-store'
import type { FeatureAccess } from '../types/payment-types'

// Feature gate hook
export function useFeatureGate(featureId: string): {
  hasAccess: boolean
  isLoading: boolean
  checkAccess: () => Promise<FeatureAccess>
  requireAccess: () => Promise<void>
  showUpgrade: () => void
} {
  const { featureAccess, isLoading } = usePaymentStore()
  const { checkFeature, requireFeature, showUpgrade } = usePaymentActions()

  const currentAccess = featureAccess[featureId]
  const hasAccess = currentAccess?.hasAccess ?? false

  return {
    hasAccess,
    isLoading,
    checkAccess: () => checkFeature(featureId),
    requireAccess: () => requireFeature(featureId),
    showUpgrade: () => showUpgrade(featureId)
  }
}

// Higher-order component for feature gating
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureId: string,
  fallbackComponent?: React.ComponentType<{ onUpgrade: () => void }>
) {
  return function FeatureGatedComponent(props: P) {
    const { hasAccess, showUpgrade } = useFeatureGate(featureId)

    if (!hasAccess) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent
        return <FallbackComponent onUpgrade={showUpgrade} />
      }

      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <div className="mb-2">🔒</div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Premium Feature
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              This feature requires a premium subscription
            </p>
            <button
              onClick={() => showUpgrade()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
}

// Feature gate component
interface FeatureGateProps {
  featureId: string
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  className?: string
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureId,
  children,
  fallback,
  loadingComponent,
  className = ''
}) => {
  const { hasAccess, isLoading, showUpgrade } = useFeatureGate(featureId)

  if (isLoading && loadingComponent) {
    return <div className={className}>{loadingComponent}</div>
  }

  if (!hasAccess) {
    if (fallback) {
      return <div className={className}>{fallback}</div>
    }

    return (
      <div className={`p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">🔒</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Premium Feature
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Unlock this feature with a premium subscription
          </p>
          <button
            onClick={() => showUpgrade()}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors text-sm font-medium"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

// Usage limit component
interface UsageLimitGateProps {
  featureId: string
  children: React.ReactNode
  className?: string
}

export const UsageLimitGate: React.FC<UsageLimitGateProps> = ({
  featureId,
  children,
  className = ''
}) => {
  const { featureAccess } = usePaymentStore()
  const { showUpgrade } = usePaymentActions()

  const access = featureAccess[featureId]
  const hasAccess = access?.hasAccess ?? false
  const isNearLimit = access?.limit && access?.used && access.used >= access.limit * 0.8
  const isAtLimit = access?.limit && access?.used && access.used >= access.limit

  if (isAtLimit) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">⚠️</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Usage Limit Reached
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You've reached your monthly limit for this feature
          </p>
          <button
            onClick={() => showUpgrade()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            Upgrade for More Usage
          </button>
        </div>
      </div>
    )
  }

  if (isNearLimit) {
    return (
      <div className={className}>
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
              <span>⚠️</span>
              <span>
                Usage Warning: {access?.used}/{access?.limit} used this month
              </span>
            </div>
            <button
              onClick={() => showUpgrade()}
              className="text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 text-sm font-medium underline"
            >
              Upgrade
            </button>
          </div>
        </div>
        {children}
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 ${className}`}>
        <div className="text-center">
          <div className="mb-2">🔒</div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            Feature Not Available
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            This feature is not included in your current plan
          </p>
          <button
            onClick={() => showUpgrade()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            View Plans
          </button>
        </div>
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

// Conditional rendering based on subscription plan
interface PlanGateProps {
  requiredPlan: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export const PlanGate: React.FC<PlanGateProps> = ({
  requiredPlan,
  children,
  fallback,
  className = ''
}) => {
  const { plan, subscription } = usePaymentStore()
  const { showUpgrade } = usePaymentActions()

  const requiredPlans = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan]
  const hasRequiredPlan = plan && requiredPlans.includes(plan.id)
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

  if (!hasRequiredPlan || !isActive) {
    if (fallback) {
      return <div className={className}>{fallback}</div>
    }

    return (
      <div className={`p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl">👑</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Higher Plan Required
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This feature requires the {Array.isArray(requiredPlan) ? requiredPlan.join(' or ') : requiredPlan} plan
          </p>
          <button
            onClick={() => showUpgrade()}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    )
  }

  return <div className={className}>{children}</div>
}

// Trial expiration warning
export const TrialWarning: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { subscription } = usePaymentStore()
  const { showUpgrade } = usePaymentActions()

  if (subscription?.status !== 'trialing' || !subscription.trialEnd) {
    return null
  }

  const daysLeft = Math.ceil((subscription.trialEnd - Date.now()) / (24 * 60 * 60 * 1000))
  
  if (daysLeft > 3) return null // Only show when trial is ending soon

  return (
    <div className={`p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">⏰</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Trial Ending Soon
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your free trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => showUpgrade()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  )
}

// Feature access utility functions
export const featureUtils = {
  // Check if user has access to a feature
  hasAccess: (featureId: string, featureAccess: Record<string, FeatureAccess>): boolean => {
    return featureAccess[featureId]?.hasAccess ?? false
  },

  // Check if user is near usage limit
  isNearLimit: (featureId: string, featureAccess: Record<string, FeatureAccess>, threshold = 0.8): boolean => {
    const access = featureAccess[featureId]
    if (!access?.limit || !access?.used) return false
    return access.used >= access.limit * threshold
  },

  // Check if user has reached usage limit
  isAtLimit: (featureId: string, featureAccess: Record<string, FeatureAccess>): boolean => {
    const access = featureAccess[featureId]
    if (!access?.limit || access?.used === undefined) return false
    return access.used >= access.limit
  },

  // Get remaining usage for a feature
  getRemainingUsage: (featureId: string, featureAccess: Record<string, FeatureAccess>): number => {
    const access = featureAccess[featureId]
    if (!access?.limit || access?.used === undefined) return -1 // Unlimited
    return Math.max(0, access.limit - access.used)
  },

  // Format usage display
  formatUsage: (used: number, limit: number): string => {
    if (limit === -1) return `${used.toLocaleString()} (Unlimited)`
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`
  }
}