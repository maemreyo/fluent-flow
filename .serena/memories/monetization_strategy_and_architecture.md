# FluentFlow Monetization Strategy & Architecture

## 💰 Pricing Strategy (Updated)

### Pricing Tiers
- **FREE TIER**: 25 loops/month, 5 AI questions/month, basic analytics
- **STARTER TIER - $4.99/month**: 200 loops/month, 50 AI questions/month, advanced analytics, JSON export, email support
- **PRO TIER - $9.99/month**: Unlimited everything, all export formats, priority support, team features, custom AI prompts

### Target Market
- More accessible entry point with $4.99 starter tier
- Clear value progression between tiers
- Usage-based limitations to encourage upgrades

## 🏗️ Technical Architecture

### Hybrid Backend Approach: Supabase + Next.js API
**Decision**: Use existing Supabase for data storage + new Next.js API for payment logic

**Architecture**:
```
FluentFlow Extension
├── Supabase (Data Storage - SAFE DATA ONLY)
│   ├── User profiles & settings
│   ├── Loops & sessions
│   ├── Practice analytics
│   ├── Usage tracking
│   ├── Subscription status (metadata only)
│   └── License tokens (JWT signed)
└── Next.js API (Payment Logic - SENSITIVE DATA)
    ├── /api/auth/* - Authentication
    ├── /api/checkout/* - Stripe checkout
    ├── /api/subscriptions/* - Subscription management
    ├── /api/webhooks/* - Payment webhooks
    └── /api/licenses/* - License generation/validation
```

### Security Principles
**CRITICAL**: NEVER store sensitive payment data in Supabase!

**Safe Data (Supabase)**:
- ✅ Subscription status & plan names
- ✅ Feature access flags
- ✅ Usage counts & limits
- ✅ License validation tokens
- ✅ User preferences & settings

**Sensitive Data (Next.js Backend ONLY)**:
- ❌ Credit card numbers
- ❌ Payment method details
- ❌ Stripe customer secrets
- ❌ Transaction amounts
- ❌ Financial records

## 📊 Supabase Schema Design

### Payment-Related Tables (NON-SENSITIVE)

```sql
-- User Subscription Status (READ-ONLY from payment webhook)
CREATE TABLE user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL, -- 'free', 'starter', 'pro'
  plan_name TEXT NOT NULL, -- 'Free', 'Starter', 'Pro'
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  external_subscription_id TEXT, -- Encrypted reference
  external_customer_id TEXT, -- Encrypted reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly Usage Tracking
CREATE TABLE user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- '2025-01'
  loops_created INTEGER DEFAULT 0,
  ai_requests_made INTEGER DEFAULT 0,
  export_operations INTEGER DEFAULT 0,
  file_uploads INTEGER DEFAULT 0,
  custom_prompts_used INTEGER DEFAULT 0,
  features_accessed JSONB DEFAULT '{}',
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- License Tokens (for offline validation)
CREATE TABLE user_licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_token TEXT NOT NULL, -- JWT signed by payment backend
  expires_at TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_validated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment-related notifications (safe metadata only)
CREATE TABLE payment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trial_ending', 'subscription_canceled', 'payment_failed', 'usage_limit_warning', 'feature_upgrade_available')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies
- Users can only access their own payment data
- System role can update subscriptions via webhooks
- Read-only access for extensions, write access through backend API only

## 🔄 Data Synchronization Strategy

### 1. Payment Backend → Supabase Sync
- Stripe webhooks → Next.js API → Supabase updates
- Only safe metadata synced (no financial data)
- JWT license tokens generated and stored in Supabase

### 2. Real-time Usage Tracking
- Extension → Supabase RPC functions for usage increment
- Atomic operations to prevent race conditions
- Fallback to payment backend if Supabase fails

### 3. Feature Validation
- Local JWT validation in extension (offline capable)
- Online validation against Supabase for real-time limits
- Graceful degradation when offline

## 🎨 UI Design Strategy

### Adaptive Components for Space Constraints
- **Sidepanel**: 320px width, compact design needed
- **Options page**: 800px+ width, detailed layouts possible

### Component Variants:
```typescript
interface ComponentProps {
  variant?: 'compact' | 'detailed'
}

// Usage examples:
<SubscriptionStatus variant="compact" /> // For sidepanel
<UsageTracker variant="detailed" />      // For options page
```

### Layout Context:
```typescript
export const useLayoutContext = () => {
  const [context, setContext] = useState<'sidepanel' | 'options'>('sidepanel')
  // Auto-detect based on container width or URL
  return context
}
```

## 🚀 Implementation Plan

### Phase 1 (Week 1-2): Backend Setup
1. Create Next.js API for payment processing
2. Implement Stripe webhooks
3. Setup Supabase payment schema
4. Configure JWT license system

### Phase 2 (Week 3-4): Feature Gating
1. Add payment gates to AI conversations
2. Implement usage tracking
3. Create upgrade prompts
4. Add subscription status UI

### Phase 3 (Week 5-6): Polish & Testing
1. Adaptive UI components
2. Error handling & fallbacks
3. Security testing
4. Performance optimization

## 📈 Feature Monetization Map

### AI Features (High Value):
- `ai_conversations` - Generate questions from loops
- `ai_analysis` - Advanced conversation analysis
- `custom_prompts` - User-defined AI prompts

### Export & Data Features:
- `export_loops` - JSON/CSV export
- `export_analytics` - Advanced analytics export
- `data_backup` - Full data backup

### Collaboration Features:
- `team_features` - Team sharing and collaboration
- `whitelabel` - Custom branding options

## 🔒 Security Checklist

### Data Classification:
- [x] Sensitive payment data isolated in backend
- [x] Only metadata stored in Supabase
- [x] JWT tokens contain no secrets
- [x] Proper encryption for external IDs

### Access Control:
- [x] RLS policies implemented
- [x] Service role key for system operations
- [x] User authentication required
- [x] API rate limiting planned

### Compliance:
- [x] PCI DSS compliance via data separation
- [x] GDPR compliance via data minimization
- [x] Audit trail implementation
- [x] Secure key management

## 🎯 Success Metrics

### Technical Metrics:
- License validation success rate > 99.9%
- Usage tracking accuracy > 99.5%
- Payment webhook processing < 5s
- Feature gate response time < 100ms

### Business Metrics:
- Free → Starter conversion rate target: 15%
- Starter → Pro upgrade rate target: 25%
- Monthly churn rate target: < 5%
- Customer lifetime value target: $150+

## ⚠️ Critical Implementation Notes

1. **Never store sensitive payment data in Supabase**
2. **Use service role key for webhook operations**
3. **Implement proper JWT signature validation**
4. **Add fallback mechanisms for offline usage**
5. **Audit all payment-related operations**
6. **Test extensively before production deployment**

## 🔧 Existing Infrastructure Analysis

### Already Implemented (95% complete):
- PaymentService class with full Stripe integration
- LicenseValidator with JWT validation
- PaymentStore (Zustand) with state management
- UI components: UpgradeModal, SubscriptionStatus, UsageTracker
- 29+ TypeScript interfaces for payment types
- Feature gate utilities and hooks

### Missing (5% to implement):
- Supabase payment schema migration
- Next.js backend API routes
- Webhook processing logic
- UI component adaptations for space constraints
- Integration points in existing features