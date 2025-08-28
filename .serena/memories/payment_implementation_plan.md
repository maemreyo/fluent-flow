# FluentFlow Payment System Implementation Plan

## 🎯 Implementation Roadmap

### Phase 1: Supabase Schema & Database Setup

#### 1.1 Create Payment Schema Migration
**File**: `supabase/migrations/20250101_payment_features.sql`

**Tables to Create**:
- `user_subscriptions` - Subscription metadata (no financial data)
- `user_usage` - Monthly usage tracking
- `user_licenses` - JWT license tokens for offline validation
- `payment_notifications` - Safe payment-related notifications

**Key Features**:
- RLS policies for data security
- Indexes for performance
- Triggers for auto-updates
- RPC functions for usage tracking

#### 1.2 Update Existing Payment Types
**File**: `lib/types/payment-types.ts`
- Add Supabase-specific interfaces
- Extend existing types for database mapping
- Add usage tracking types

### Phase 2: Next.js Backend API Setup

#### 2.1 Create Payment API Routes
**Base URL**: Deploy to Vercel as separate Next.js app

**Required Endpoints**:
```typescript
// Authentication & Users
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout

// Subscription Management  
GET  /api/plans
POST /api/checkout/create-session
POST /api/billing/create-portal-session
GET  /api/subscriptions/current
POST /api/subscriptions/cancel
POST /api/subscriptions/reactivate

// Usage & Features
POST /api/usage/track
GET  /api/usage/current
POST /api/features/check-access

// License Management
GET  /api/license/current
POST /api/license/refresh
POST /api/license/generate

// Webhooks
POST /api/webhooks/stripe
```

#### 2.2 Environment Configuration
```bash
# Payment Backend .env.local
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Extension .env (existing)
NEXT_PUBLIC_PAYMENT_API_URL=https://fluentflow-payments.vercel.app
```

### Phase 3: Feature Gate Integration

#### 3.1 AI Conversation Limits
**File**: `lib/services/conversation-loop-integration-service.ts`
```typescript
async generateQuestions(loop: SavedLoop): Promise<ConversationQuestions> {
  // Check feature access
  await licenseValidator.requireFeatureAccess('ai_conversations')
  
  // Track usage
  await usageTracker.trackFeatureUsage('ai_conversations')
  
  return this.analysisService.generateQuestions(loop)
}
```

#### 3.2 Loop Export Restrictions  
**File**: `sidepanel.tsx` (exportLoop function)
```typescript
const exportLoop = async (loop: SavedLoop) => {
  try {
    await licenseValidator.requireFeatureAccess('export_loops')
    // Existing export logic
  } catch (error) {
    if (error.code === 'FEATURE_NOT_AVAILABLE') {
      usePaymentStore.getState().showUpgrade('export_loops')
    }
  }
}
```

#### 3.3 Analytics Dashboard Limits
**File**: `components/tabs/DashboardTab.tsx`
```typescript
<FeatureGate featureId="advanced_analytics">
  <EnhancedAnalyticsPanel />
</FeatureGate>

<PremiumFeature featureId="advanced_analytics" fallback={<BasicAnalytics />}>
  <AdvancedAnalyticsPanel />
</PremiumFeature>
```

### Phase 4: UI Component Adaptations

#### 4.1 Layout Context System
**File**: `lib/contexts/layout-context.tsx`
```typescript
export const LayoutProvider = ({ children }) => {
  const [layoutMode, setLayoutMode] = useState<'sidepanel' | 'options'>()
  
  useEffect(() => {
    const isOptionsPage = window.location.pathname.includes('options')
    setLayoutMode(isOptionsPage ? 'options' : 'sidepanel')
  }, [])
  
  return (
    <LayoutContext.Provider value={{ layoutMode }}>
      {children}
    </LayoutContext.Provider>
  )
}
```

#### 4.2 Adaptive Components
**File**: `components/payment/compact-usage-tracker.tsx`
```typescript
export function CompactUsageTracker({ 
  featureId, 
  variant = 'auto' 
}: {
  featureId: string
  variant?: 'compact' | 'detailed' | 'auto'
}) {
  const { layoutMode } = useLayout()
  const displayVariant = variant === 'auto' 
    ? (layoutMode === 'sidepanel' ? 'compact' : 'detailed')
    : variant

  if (displayVariant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Badge variant={hasAccess ? 'secondary' : 'destructive'} className="h-5">
          {used}/{limit}
        </Badge>
        <Progress value={(used/limit) * 100} className="h-1 flex-1" />
      </div>
    )
  }

  return (
    <Card className="p-4">
      {/* Detailed version */}
    </Card>
  )
}
```

#### 4.3 Sidepanel Integration
**File**: `sidepanel.tsx`
```typescript
// Add to header section
<div className="flex items-center gap-2">
  <CompactUsageIndicator />
  <AuthStatus variant="compact" />
  <CompactSubscriptionBadge />
</div>

// Add usage warning banner
<UsageLimitBanner variant="compact" />
```

#### 4.4 Options Page Payment Section
**File**: `options.tsx`
```typescript
// Add new payment section
<Card>
  <CardHeader>
    <CardTitle>Subscription & Billing</CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <SubscriptionStatus variant="detailed" />
    <UsageTracker variant="detailed" />
    <BillingHistory />
    <PaymentMethods />
  </CardContent>
</Card>
```

### Phase 5: Data Synchronization

#### 5.1 Webhook Implementation
**File**: `api/webhooks/stripe.ts`
```typescript
export default async function handler(req, res) {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  )

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscriptionToSupabase(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCancellation(event.data.object)
      break
  }

  res.status(200).json({ received: true })
}
```

#### 5.2 Usage Tracking Service
**File**: `lib/services/usage-tracking-service.ts`
```typescript
export class UsageTrackingService {
  async trackFeatureUsage(featureId: string, amount = 1) {
    // Primary: Update Supabase via RPC
    const { data, error } = await supabase.rpc('increment_usage', {
      feature_id: featureId,
      usage_amount: amount
    })

    if (error) {
      // Fallback: Update via payment API
      await this.updateViaPaymentAPI(featureId, amount)
    }

    return data
  }
}
```

## 📋 Implementation Checklist

### Database Setup
- [ ] Create Supabase migration file
- [ ] Add user_subscriptions table
- [ ] Add user_usage table  
- [ ] Add user_licenses table
- [ ] Add payment_notifications table
- [ ] Create RLS policies
- [ ] Add indexes for performance
- [ ] Create RPC functions for usage

### Backend API
- [ ] Setup Next.js project structure
- [ ] Implement authentication endpoints
- [ ] Create subscription management APIs
- [ ] Add Stripe checkout integration
- [ ] Implement webhook handlers
- [ ] Add license generation logic
- [ ] Setup environment variables
- [ ] Deploy to Vercel

### Feature Integration
- [ ] Update conversation service with gates
- [ ] Add export restrictions
- [ ] Implement analytics limits
- [ ] Create usage tracking calls
- [ ] Add error handling for limits
- [ ] Test offline license validation

### UI Components
- [ ] Create layout context provider
- [ ] Build compact usage tracker
- [ ] Update subscription status component
- [ ] Add upgrade modal variants
- [ ] Create billing history component
- [ ] Update sidepanel layout
- [ ] Enhance options page
- [ ] Test responsive behavior

### Security & Testing
- [ ] Audit data classification
- [ ] Test RLS policies
- [ ] Validate JWT signatures
- [ ] Test webhook processing
- [ ] Load test usage tracking
- [ ] Security penetration testing
- [ ] End-to-end payment flow testing

## 🚀 Deployment Strategy

### 1. Development Environment
1. Setup local Supabase instance
2. Create test Stripe account
3. Deploy backend to Vercel preview
4. Test with development extension

### 2. Staging Environment
1. Deploy schema to staging Supabase
2. Deploy backend to staging Vercel
3. Test with staging extension build
4. Run automated test suite

### 3. Production Deployment
1. Deploy schema migration to production Supabase
2. Deploy backend to production Vercel
3. Update extension with production API URLs
4. Monitor metrics and error rates

## ⚠️ Risk Mitigation

### Technical Risks
- **Webhook failures**: Implement retry logic and dead letter queues
- **Usage sync issues**: Add reconciliation jobs
- **License validation failures**: Implement graceful degradation
- **API rate limits**: Add caching and request queuing

### Business Risks  
- **Payment processor issues**: Have Stripe backup ready
- **Compliance violations**: Regular security audits
- **Data loss**: Automated backups and testing
- **Performance degradation**: Monitoring and alerting

## 📊 Success Metrics

### Technical KPIs
- License validation success rate > 99.9%
- Usage tracking accuracy > 99.5%
- Payment processing latency < 3s
- API uptime > 99.9%

### Business KPIs
- Conversion rate tracking
- Churn rate monitoring  
- Revenue per user metrics
- Feature adoption rates

This implementation plan provides a complete roadmap for adding monetization to FluentFlow while maintaining security, performance, and user experience.