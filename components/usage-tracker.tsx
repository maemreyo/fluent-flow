// Usage Tracker - Shows current usage and limits
// Visual progress bars and upgrade prompts

import React from 'react'
import { 
  BarChart3, 
  Zap, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Crown
} from 'lucide-react'
import { useUsage, useSubscription, usePaymentActions } from '../lib/stores/payment-store'
import { formatDistanceToNow } from 'date-fns'

interface UsageTrackerProps {
  className?: string
  showDetails?: boolean
}

export const UsageTracker: React.FC<UsageTrackerProps> = ({
  className = '',
  showDetails = true
}) => {
  const { usage, featureAccess } = useUsage()
  const { plan, subscription } = useSubscription()
  const { showUpgrade } = usePaymentActions()

  const isActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing'

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500 bg-red-500'
    if (percentage >= 75) return 'text-yellow-500 bg-yellow-500'
    return 'text-green-500 bg-green-500'
  }

  const formatUsage = (used: number, limit: number) => {
    if (limit === -1) return `${used.toLocaleString()} (Unlimited)`
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`
  }

  const usageItems = [
    {
      id: 'ai_requests',
      name: 'AI Requests',
      icon: Zap,
      used: usage?.aiRequests || 0,
      limit: plan?.limits.aiRequests || 0,
      description: 'Monthly AI processing requests'
    },
    {
      id: 'conversations',
      name: 'Conversations',
      icon: MessageSquare,
      used: usage?.conversations || 0,
      limit: plan?.limits.conversations || 0,
      description: 'Active chat conversations'
    },
    {
      id: 'tokens',
      name: 'Tokens Used',
      icon: BarChart3,
      used: usage?.tokensUsed || 0,
      limit: -1, // Usually unlimited or very high
      description: 'Total tokens processed this month'
    }
  ]

  if (!plan || !usage) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center justify-center h-24">
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            Usage data not available
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Usage Overview
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {plan.displayName} Plan • {
                  isActiveSubscription ? 'Active' : 'Inactive'
                }
              </p>
            </div>
          </div>

          {!isActiveSubscription && (
            <button
              onClick={() => showUpgrade()}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors text-sm font-medium"
            >
              <Crown size={16} />
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="p-4">
        <div className="space-y-4">
          {usageItems.map((item) => {
            const percentage = getUsagePercentage(item.used, item.limit)
            const colorClasses = getUsageColor(percentage)
            const isNearLimit = percentage >= 75 && item.limit !== -1
            const Icon = item.icon

            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </span>
                    {isNearLimit && (
                      <AlertTriangle size={16} className="text-yellow-500" />
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatUsage(item.used, item.limit)}
                    </div>
                    {item.limit !== -1 && (
                      <div className={`text-sm ${colorClasses.split(' ')[0]}`}>
                        {percentage.toFixed(0)}% used
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {item.limit !== -1 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${colorClasses.split(' ')[1]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}

                {showDetails && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                )}

                {/* Near limit warning */}
                {isNearLimit && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <AlertTriangle size={14} />
                      <span>
                        You're approaching your {item.name.toLowerCase()} limit. 
                        {item.limit - item.used} remaining.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Usage Period */}
        {usage.lastUpdated && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>Current billing period</span>
              </div>
              <span>
                Updated {formatDistanceToNow(usage.lastUpdated, { addSuffix: true })}
              </span>
            </div>
          </div>
        )}

        {/* Upgrade prompt for free users */}
        {!isActiveSubscription && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Unlock More Usage
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upgrade to get unlimited AI requests and advanced features
                </p>
              </div>
              <button
                onClick={() => showUpgrade()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Feature Access Status */}
        {showDetails && Object.keys(featureAccess).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Feature Access
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(featureAccess).map(([featureId, access]) => (
                <div
                  key={featureId}
                  className={`p-2 rounded-lg border ${
                    access.hasAccess
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {featureId.replace('_', ' ')}
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        access.hasAccess ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                  {access.limit && access.used !== undefined && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {access.used}/{access.limit} used
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}