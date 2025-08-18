// Subscription Status - Shows current subscription details and management
// Billing portal access and subscription controls

import React, { useState } from 'react'
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Loader2,
  Settings,
  RefreshCw
} from 'lucide-react'
import { useSubscription, usePaymentActions, useAuth } from '../lib/stores/payment-store'
import { formatDistanceToNow, format } from 'date-fns'

interface SubscriptionStatusProps {
  className?: string
  showDetails?: boolean
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  className = '',
  showDetails = true
}) => {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { subscription, plan, isLoading: storeLoading } = useSubscription()
  const { isAuthenticated } = useAuth()
  const { 
    openBillingPortal, 
    cancelSubscription, 
    reactivateSubscription,
    loadSubscription,
    showUpgrade
  } = usePaymentActions()

  const handleBillingPortal = async () => {
    setIsLoading('portal')
    try {
      const portalUrl = await openBillingPortal()
      chrome.tabs.create({ url: portalUrl })
    } catch (error) {
      console.error('Failed to open billing portal:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }

    setIsLoading('cancel')
    try {
      await cancelSubscription()
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleReactivateSubscription = async () => {
    setIsLoading('reactivate')
    try {
      await reactivateSubscription()
    } catch (error) {
      console.error('Failed to reactivate subscription:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleRefresh = async () => {
    setIsLoading('refresh')
    try {
      await loadSubscription()
    } catch (error) {
      console.error('Failed to refresh subscription:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const getStatusInfo = () => {
    if (!subscription) {
      return {
        status: 'Free',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        icon: XCircle,
        description: 'No active subscription'
      }
    }

    switch (subscription.status) {
      case 'active':
        return {
          status: 'Active',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          icon: CheckCircle,
          description: 'Your subscription is active'
        }
      case 'trialing':
        return {
          status: 'Trial',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          icon: Crown,
          description: 'Free trial active'
        }
      case 'canceled':
        return {
          status: 'Canceled',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          icon: AlertTriangle,
          description: 'Canceled - active until period ends'
        }
      case 'past_due':
        return {
          status: 'Past Due',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          icon: AlertTriangle,
          description: 'Payment failed - please update billing'
        }
      case 'unpaid':
        return {
          status: 'Unpaid',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          icon: XCircle,
          description: 'Payment required'
        }
      default:
        return {
          status: subscription.status,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          icon: XCircle,
          description: 'Unknown status'
        }
    }
  }

  if (!isAuthenticated) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to view subscription status
          </p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon
  const now = Date.now()
  const isExpiringSoon = subscription && subscription.currentPeriodEnd - now < 7 * 24 * 60 * 60 * 1000 // 7 days

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
              <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Subscription Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {statusInfo.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading === 'refresh'}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh subscription status"
          >
            <RefreshCw 
              size={16} 
              className={`text-gray-600 dark:text-gray-400 ${
                isLoading === 'refresh' ? 'animate-spin' : ''
              }`} 
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {subscription && plan ? (
          <div className="space-y-4">
            {/* Plan Info */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {plan.displayName}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {plan.description}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.status}
              </div>
            </div>

            {showDetails && (
              <>
                {/* Billing Period */}
                <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar size={14} />
                    <span>Current period</span>
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {format(subscription.currentPeriodStart, 'MMM d')} - {format(subscription.currentPeriodEnd, 'MMM d, yyyy')}
                  </div>
                </div>

                {/* Next billing */}
                {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CreditCard size={14} />
                      <span>Next billing</span>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatDistanceToNow(subscription.currentPeriodEnd, { addSuffix: true })}
                    </div>
                  </div>
                )}

                {/* Trial end */}
                {subscription.status === 'trialing' && subscription.trialEnd && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Crown size={14} />
                      <span>Trial ends</span>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatDistanceToNow(subscription.trialEnd, { addSuffix: true })}
                    </div>
                  </div>
                )}

                {/* Cancellation notice */}
                {subscription.cancelAtPeriodEnd && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <AlertTriangle size={14} />
                      <span>
                        Your subscription will end on {format(subscription.currentPeriodEnd, 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Expiring soon notice */}
                {isExpiringSoon && !subscription.cancelAtPeriodEnd && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <AlertTriangle size={14} />
                      <span>
                        Your subscription renews in {formatDistanceToNow(subscription.currentPeriodEnd)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment issue notice */}
                {(subscription.status === 'past_due' || subscription.status === 'unpaid') && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                      <AlertTriangle size={14} />
                      <span>
                        Please update your payment method to continue using premium features
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBillingPortal}
                disabled={isLoading === 'portal'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium"
              >
                {isLoading === 'portal' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <Settings size={16} />
                    Manage Billing
                    <ExternalLink size={14} />
                  </>
                )}
              </button>

              {subscription.cancelAtPeriodEnd ? (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={isLoading === 'reactivate'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {isLoading === 'reactivate' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Reactivate
                    </>
                  )}
                </button>
              ) : subscription.status === 'active' ? (
                <button
                  onClick={handleCancelSubscription}
                  disabled={isLoading === 'cancel'}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {isLoading === 'cancel' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Cancel
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          // No subscription
          <div className="text-center py-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Crown className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              No Active Subscription
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upgrade to unlock premium features and unlimited usage
            </p>
            <button
              onClick={() => showUpgrade()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              View Plans
            </button>
          </div>
        )}
      </div>
    </div>
  )
}