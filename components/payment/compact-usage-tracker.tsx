// Compact Usage Tracker - Adaptive component for showing feature usage and limits
// Switches between compact and detailed views based on layout context

import { useEffect, useState } from 'react'
import { AlertCircle, Crown, TrendingUp } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { useAdaptiveLayout } from '../../lib/contexts/layout-context'
import { supabasePaymentService } from '../../lib/services/supabase-payment-service'
import { usePaymentActions } from '../../lib/stores/payment-store'
import type { SupabaseFeatureAccessResponse } from '../../lib/types/payment-types'

export interface CompactUsageTrackerProps {
  featureId: string
  featureName?: string
  className?: string
  variant?: 'auto' | 'compact' | 'detailed'
}

export function CompactUsageTracker({
  featureId,
  featureName,
  className = '',
  variant = 'auto'
}: CompactUsageTrackerProps) {
  const layout = useAdaptiveLayout('usage-tracker')
  const { showUpgrade } = usePaymentActions()
  
  const [access, setAccess] = useState<SupabaseFeatureAccessResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const displayVariant = variant === 'auto' 
    ? (layout.isCompact ? 'compact' : 'detailed')
    : variant

  const displayName = featureName || formatFeatureName(featureId)

  useEffect(() => {
    const fetchAccess = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await supabasePaymentService.checkFeatureAccess(featureId)
        setAccess(response)
      } catch (err) {
        console.error(`Failed to check access for ${featureId}:`, err)
        setError('Failed to load usage data')
      } finally {
        setLoading(false)
      }
    }

    fetchAccess()
  }, [featureId])

  const handleUpgrade = () => {
    showUpgrade(featureId)
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {displayVariant === 'compact' ? (
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-muted rounded"></div>
            <div className="h-1 flex-1 bg-muted rounded"></div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (error || !access) {
    if (displayVariant === 'compact') {
      return (
        <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
          <AlertCircle className="h-3 w-3" />
          <span>Error</span>
        </div>
      )
    }

    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Unable to load usage data</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate progress percentage
  const progressPercentage = access.limit && access.limit > 0 && access.current_usage !== undefined
    ? Math.min((access.current_usage / access.limit) * 100, 100)
    : 0

  // Determine status color
  const getStatusColor = () => {
    if (!access.has_access) return 'destructive'
    if (access.usage_limit_reached) return 'destructive'
    if (progressPercentage > 80) return 'warning'
    return 'secondary'
  }

  if (displayVariant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant={getStatusColor() as any} 
          className="h-5 text-xs px-2 py-0.5 shrink-0"
        >
          {access.has_access ? (
            access.limit === -1 || !access.limit ? (
              '∞'
            ) : (
              `${access.current_usage || 0}/${access.limit}`
            )
          ) : (
            <Crown className="h-3 w-3" />
          )}
        </Badge>
        
        {access.has_access && access.limit && access.limit > 0 && (
          <div className="flex-1 min-w-0">
            <Progress 
              value={progressPercentage} 
              className="h-1"
            />
          </div>
        )}

        {!access.has_access && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
            onClick={handleUpgrade}
          >
            Upgrade
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
          <CardTitle className="text-sm font-medium">{displayName}</CardTitle>
          <Badge variant={getStatusColor() as any}>
            {access.has_access ? (
              access.usage_limit_reached ? 'Limit Reached' : 'Active'
            ) : (
              'Upgrade Required'
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {access.has_access ? (
          <>
            {access.limit && access.limit > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used this month</span>
                  <span className="font-medium">
                    {access.current_usage || 0} of {access.limit}
                  </span>
                </div>
                
                <Progress value={progressPercentage} className="h-2" />
                
                {access.remaining !== undefined && access.remaining >= 0 && (
                  <div className="text-xs text-muted-foreground">
                    {access.remaining} remaining this month
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Unlimited usage</span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This feature requires a premium subscription to use.
            </p>
            <Button 
              size="sm" 
              className="w-full"
              onClick={handleUpgrade}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to format feature IDs into readable names
function formatFeatureName(featureId: string): string {
  const nameMap: Record<string, string> = {
    'loops_created': 'Loop Creation',
    'ai_conversations': 'AI Questions',
    'export_loops': 'Export Loops',
    'file_uploads': 'File Uploads',
    'custom_prompts': 'Custom Prompts',
    'advanced_analytics': 'Advanced Analytics',
    'team_features': 'Team Features',
    'whitelabel': 'White Label'
  }

  return nameMap[featureId] || featureId.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

// Batch usage tracker for showing multiple features at once
export interface BatchUsageTrackerProps {
  features: Array<{
    id: string
    name?: string
  }>
  className?: string
  variant?: 'auto' | 'compact' | 'detailed'
}

export function BatchUsageTracker({
  features,
  className = '',
  variant = 'auto'
}: BatchUsageTrackerProps) {
  const layout = useAdaptiveLayout('usage-tracker')

  const displayVariant = variant === 'auto' 
    ? (layout.isCompact ? 'compact' : 'detailed')
    : variant

  if (displayVariant === 'compact') {
    // Show only the most important features in compact mode
    const priorityFeatures = features.slice(0, 2)
    
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {priorityFeatures.map(feature => (
          <CompactUsageTracker
            key={feature.id}
            featureId={feature.id}
            featureName={feature.name}
            variant="compact"
          />
        ))}
      </div>
    )
  }

  // Show all features in detailed mode
  return (
    <div className={`grid gap-4 ${className}`}>
      {features.map(feature => (
        <CompactUsageTracker
          key={feature.id}
          featureId={feature.id}
          featureName={feature.name}
          variant="detailed"
        />
      ))}
    </div>
  )
}