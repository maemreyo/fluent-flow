// Compact Subscription Status - Shows subscription info in space-efficient way
// Adapts between minimal badge and detailed card based on layout context

import { useEffect, useState } from 'react'
import { Crown, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useAdaptiveLayout } from '../../lib/contexts/layout-context'
import { supabasePaymentService } from '../../lib/services/supabase-payment-service'
import { usePaymentActions, useAuth, useSubscription } from '../../lib/stores/payment-store'
import type { DatabaseSubscription } from '../../lib/types/payment-types'
import { formatDistanceToNow, format } from 'date-fns'

export interface CompactSubscriptionStatusProps {
  className?: string
  variant?: 'auto' | 'compact' | 'detailed'
  showUpgradeButton?: boolean
}

export function CompactSubscriptionStatus({
  className = '',
  variant = 'auto',
  showUpgradeButton = true
}: CompactSubscriptionStatusProps) {
  const layout = useAdaptiveLayout('subscription-status')
  const { showUpgrade } = usePaymentActions()
  const { isAuthenticated } = useAuth()
  
  const [subscription, setSubscription] = useState<DatabaseSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  const displayVariant = variant === 'auto' 
    ? (layout.isCompact ? 'compact' : 'detailed')
    : variant

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const sub = await supabasePaymentService.getSubscription()
        setSubscription(sub)
      } catch (error) {
        console.error('Failed to fetch subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [isAuthenticated])

  const handleUpgrade = () => {
    showUpgrade()
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {displayVariant === 'compact' ? (
          <div className="flex items-center gap-1">
            <div className="h-5 w-12 bg-muted rounded"></div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Determine subscription status and styling
  const getStatusInfo = () => {
    if (!subscription || subscription.plan_id === 'free') {
      return {
        planName: 'Free',
        status: subscription?.status || 'active',
        variant: 'secondary' as const,
        icon: null,
        urgent: false,
        description: 'Basic features only'
      }
    }

    const isActive = subscription.status === 'active' || subscription.status === 'trialing'
    const isTrialing = subscription.status === 'trialing'
    const isPastDue = subscription.status === 'past_due'
    const isCanceled = subscription.status === 'canceled'

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default'
    let icon = <CheckCircle className="h-3 w-3" />
    let urgent = false
    let description = subscription.plan_name

    if (isTrialing) {
      variant = 'outline'
      icon = <Clock className="h-3 w-3" />
      description = `${subscription.plan_name} (Trial)`
    } else if (isPastDue) {
      variant = 'destructive'
      icon = <AlertTriangle className="h-3 w-3" />
      description = 'Payment required'
      urgent = true
    } else if (isCanceled) {
      variant = 'outline'
      icon = <AlertTriangle className="h-3 w-3" />
      description = 'Canceled'
      urgent = true
    } else if (isActive) {
      variant = 'default'
      icon = <Crown className="h-3 w-3" />
      description = subscription.plan_name
    }

    return {
      planName: subscription.plan_name,
      status: subscription.status,
      variant,
      icon,
      urgent,
      description
    }
  }

  const statusInfo = getStatusInfo()

  if (displayVariant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Badge 
          variant={statusInfo.variant} 
          className="h-5 text-xs px-2 py-0.5 flex items-center gap-1"
        >
          {statusInfo.icon}
          <span>{statusInfo.planName}</span>
        </Badge>
        
        {statusInfo.urgent && showUpgradeButton && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-red-600 hover:text-red-700"
            onClick={handleUpgrade}
          >
            Fix
          </Button>
        )}
      </div>
    )
  }

  // Detailed view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
            {statusInfo.icon}
            <span>{statusInfo.description}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {subscription && subscription.plan_id !== 'free' ? (
          <div className="space-y-2">
            {subscription.current_period_end && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {subscription.status === 'trialing' ? 'Trial ends' : 'Renews'}
                </span>
                <span className="font-medium">
                  {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                </span>
              </div>
            )}

            {subscription.current_period_end && (
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(subscription.current_period_end), { addSuffix: true })}
              </div>
            )}

            {(statusInfo.urgent || subscription.plan_id === 'free') && showUpgradeButton && (
              <Button 
                size="sm" 
                className="w-full"
                variant={statusInfo.urgent ? 'default' : 'outline'}
                onClick={handleUpgrade}
              >
                <Crown className="h-4 w-4 mr-2" />
                {statusInfo.urgent ? 'Update Payment' : 'Upgrade Plan'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You're using the free plan with limited features.
            </p>
            {showUpgradeButton && (
              <Button 
                size="sm" 
                className="w-full"
                onClick={handleUpgrade}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Usage limit banner for showing warnings when approaching limits
export interface UsageLimitBannerProps {
  className?: string
  variant?: 'auto' | 'compact' | 'detailed'
}

export function UsageLimitBanner({
  className = '',
  variant = 'auto'
}: UsageLimitBannerProps) {
  const layout = useAdaptiveLayout('usage-banner')
  const { showUpgrade } = usePaymentActions()
  const { isAuthenticated } = useAuth()
  
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const displayVariant = variant === 'auto' 
    ? (layout.isCompact ? 'compact' : 'detailed')
    : variant

  useEffect(() => {
    const checkUsageLimits = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const features = ['loops_created', 'ai_conversations', 'export_loops']
        const warningMessages: string[] = []

        for (const featureId of features) {
          const access = await supabasePaymentService.checkFeatureAccess(featureId)
          
          if (access.usage_limit_reached) {
            warningMessages.push(`${formatFeatureName(featureId)} limit reached`)
          } else if (access.current_usage && access.limit && access.limit > 0) {
            const percentage = (access.current_usage / access.limit) * 100
            if (percentage >= 80) {
              warningMessages.push(`${formatFeatureName(featureId)} ${Math.round(percentage)}% used`)
            }
          }
        }

        setWarnings(warningMessages)
      } catch (error) {
        console.error('Failed to check usage limits:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUsageLimits()
  }, [isAuthenticated])

  if (!isAuthenticated || loading || warnings.length === 0) {
    return null
  }

  const handleUpgrade = () => {
    showUpgrade()
  }

  if (displayVariant === 'compact') {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-md p-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-800">
              {warnings.length === 1 ? warnings[0] : `${warnings.length} limits approaching`}
            </span>
          </div>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-amber-700 hover:text-amber-800"
            onClick={handleUpgrade}
          >
            Upgrade
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className={`border-amber-200 bg-amber-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-medium text-amber-800">Usage Limits</h4>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index} className="text-xs text-amber-700">
                  • {warning}
                </div>
              ))}
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="mt-2"
              onClick={handleUpgrade}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade for More
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to format feature names
function formatFeatureName(featureId: string): string {
  const nameMap: Record<string, string> = {
    'loops_created': 'Loops',
    'ai_conversations': 'AI Questions',
    'export_loops': 'Exports',
    'file_uploads': 'Uploads',
    'custom_prompts': 'Custom Prompts'
  }

  return nameMap[featureId] || featureId
}