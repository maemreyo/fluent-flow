// Upgrade Modal - Subscription upgrade interface
// Beautiful pricing modal with feature comparison

import React, { useState } from 'react'
import { 
  X, 
  Check, 
  Star, 
  Zap, 
  Crown, 
  Loader2,
  CreditCard,
  Shield,
  Users,
  BarChart3
} from 'lucide-react'
import { usePaymentStore, useSubscription, usePaymentActions } from '../lib/stores/payment-store'
import type { SubscriptionPlan } from '../lib/types/payment-types'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedPlan?: string
  featureId?: string
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  preselectedPlan,
  featureId
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>(preselectedPlan || '')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [isLoading, setIsLoading] = useState(false)
  
  const { availablePlans } = useSubscription()
  const { createCheckout, clearError } = usePaymentActions()
  const { error } = usePaymentStore()

  const handleUpgrade = async () => {
    if (!selectedPlan) return

    setIsLoading(true)
    try {
      const checkoutUrl = await createCheckout(selectedPlan, billingPeriod)
      
      // Open checkout in new tab
      chrome.tabs.create({ url: checkoutUrl })
      onClose()
    } catch (error) {
      console.error('Checkout failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPlanIcon = (planId: string) => {
    switch (planId.toLowerCase()) {
      case 'basic':
      case 'starter':
        return <Zap className="w-6 h-6" />
      case 'pro':
      case 'professional':
        return <Crown className="w-6 h-6" />
      case 'enterprise':
      case 'business':
        return <Users className="w-6 h-6" />
      default:
        return <Star className="w-6 h-6" />
    }
  }

  const formatPrice = (plan: SubscriptionPlan) => {
    const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly
    const suffix = billingPeriod === 'monthly' ? '/month' : '/year'
    
    if (billingPeriod === 'yearly') {
      const monthlyEquivalent = price / 12
      return {
        main: `$${price}${suffix}`,
        sub: `$${monthlyEquivalent.toFixed(0)}/month billed annually`
      }
    }
    
    return {
      main: `$${price}${suffix}`,
      sub: null
    }
  }

  const getYearlySavings = (plan: SubscriptionPlan) => {
    const yearlyPrice = plan.priceYearly
    const monthlyYearlyPrice = plan.priceMonthly * 12
    const savings = monthlyYearlyPrice - yearlyPrice
    const percentage = Math.round((savings / monthlyYearlyPrice) * 100)
    
    return { amount: savings, percentage }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Upgrade Your Plan
            </h2>
            {featureId && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Unlock "{featureId}" and many more premium features
              </p>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Billing Period Toggle */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  Save 25%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlans.map((plan) => {
              const pricing = formatPrice(plan)
              const savings = getYearlySavings(plan)
              const isSelected = selectedPlan === plan.id
              const isPopular = plan.popular

              return (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-3 text-blue-500">
                      {getPlanIcon(plan.id)}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.displayName}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {plan.description}
                    </p>

                    {/* Pricing */}
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {pricing.main}
                      </span>
                      {billingPeriod === 'yearly' && savings.amount > 0 && (
                        <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Save ${savings.amount}/year ({savings.percentage}% off)
                        </div>
                      )}
                    </div>
                    
                    {pricing.sub && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pricing.sub}
                      </p>
                    )}

                    {plan.trialDays && (
                      <div className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                        {plan.trialDays}-day free trial
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.slice(0, 5).map((feature) => (
                      <div key={feature.id} className="flex items-center">
                        <Check 
                          size={16} 
                          className={`mr-3 flex-shrink-0 ${
                            feature.included 
                              ? 'text-green-500' 
                              : 'text-gray-300 dark:text-gray-600'
                          }`} 
                        />
                        <span className={`text-sm ${
                          feature.included 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-400 line-through'
                        }`}>
                          {feature.name}
                          {feature.limit && feature.limit > 0 && (
                            <span className="text-gray-500">
                              {` (${feature.limit.toLocaleString()})`}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}

                    {/* Key Limits */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <BarChart3 size={14} className="mr-2" />
                        <span>
                          {plan.limits.aiRequests === -1 
                            ? 'Unlimited AI requests'
                            : `${plan.limits.aiRequests.toLocaleString()} AI requests/month`
                          }
                        </span>
                      </div>
                      
                      {plan.limits.prioritySupport && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <Shield size={14} className="mr-2" />
                          <span>Priority support</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Select Button */}
                  <button
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select Plan'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Shield size={16} className="mr-2" />
              <span>Secure payment powered by Stripe</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  clearError()
                  onClose()
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleUpgrade}
                disabled={!selectedPlan || isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Upgrade Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Shield size={14} className="mr-1" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center">
                <CreditCard size={14} className="mr-1" />
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center">
                <Check size={14} className="mr-1" />
                <span>30-day Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}