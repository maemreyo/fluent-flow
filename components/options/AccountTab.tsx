import { Database } from 'lucide-react'
import { AuthComponent } from '../auth-component'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { CompactSubscriptionStatus, UsageLimitBanner } from '../payment/compact-subscription-status'
import { BatchUsageTracker } from '../payment/compact-usage-tracker'

interface AccountTabProps {
  isAuthenticated: boolean
  user: any
}

export function AccountTab({ isAuthenticated, user }: AccountTabProps) {
  const usageFeatures = [
    { id: 'loops_created', name: 'Loops' },
    { id: 'ai_conversations', name: 'AI Questions' },
    { id: 'export_loops', name: 'Exports' }
  ]

  return (
    <div className="space-y-6">
      <AuthComponent onAuthSuccess={() => {}} />

      {/* Payment and Usage Section - Only show when authenticated */}
      {isAuthenticated && (
        <>
          <CompactSubscriptionStatus variant="detailed" className="w-full" />
          
          <UsageLimitBanner variant="detailed" className="w-full" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Usage & Features
              </CardTitle>
              <CardDescription>
                Monitor your current usage and available features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BatchUsageTracker
                features={usageFeatures}
                variant="detailed"
                className="grid-cols-1 md:grid-cols-3"
              />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Sync Status
          </CardTitle>
          <CardDescription>
            FluentFlow uses Supabase to sync your data across devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sync Status</Label>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`}
              ></div>
              <span className="text-sm">
                {isAuthenticated ? 'Connected to cloud storage' : 'Using local storage only'}
              </span>
            </div>
            {user && (
              <p className="text-xs text-muted-foreground">
                Signed in as: {user.email || user.full_name || 'User'}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Features Available</Label>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Practice sessions sync across devices</li>
              <li>• Audio recordings stored securely</li>
              <li>• Progress analytics and statistics</li>
              <li>• Loop segments and practice data</li>
              {isAuthenticated && (
                <>
                  <li>• Premium AI conversation features</li>
                  <li>• Advanced usage analytics</li>
                  <li>• Export and backup capabilities</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}