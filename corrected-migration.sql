-- Clean Payment Migration - Fixed version
-- Copy this entire content and paste into Supabase SQL Editor

-- Drop any existing conflicting functions
DROP FUNCTION IF EXISTS cleanup_expired_notifications();
DROP FUNCTION IF EXISTS cleanup_old_usage_data();
DROP FUNCTION IF EXISTS check_feature_access(text);
DROP FUNCTION IF EXISTS get_subscription_summary();
DROP FUNCTION IF EXISTS increment_usage(text, integer, text);

-- User Subscription Status (Synced from payment backend via webhooks)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Safe subscription metadata (NO financial data)
  plan_id TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro'
  plan_name TEXT NOT NULL DEFAULT 'Free', -- 'Free', 'Starter', 'Pro'  
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete')) DEFAULT 'active',
  
  -- Safe dates (no financial amounts)
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  -- Feature flags derived from plan (safe metadata)
  features JSONB NOT NULL DEFAULT '{
    "ai_conversations": true,
    "export_loops": true, 
    "advanced_analytics": false,
    "team_features": false,
    "priority_support": false,
    "custom_prompts": false,
    "whitelabel": false
  }',
  
  -- Usage limits per plan (safe metadata - using -1 for unlimited)
  limits JSONB NOT NULL DEFAULT '{
    "loops_per_month": -1,
    "ai_requests_per_month": -1,
    "file_uploads_per_month": 0,
    "custom_prompts_per_month": 0,
    "export_operations_per_month": -1
  }',
  
  -- External references (encrypted IDs only, NO sensitive data)
  external_subscription_id TEXT,
  external_customer_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add unique constraint on user_id
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Monthly Usage Tracking (User activity counters)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage period (monthly tracking)
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM' (e.g., '2025-01')
  
  -- Core feature usage counters
  loops_created INTEGER DEFAULT 0,
  ai_requests_made INTEGER DEFAULT 0,
  export_operations INTEGER DEFAULT 0,
  file_uploads INTEGER DEFAULT 0,
  custom_prompts_used INTEGER DEFAULT 0,
  
  -- Generic feature usage tracking (for future features)
  features_accessed JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per user per month
  CONSTRAINT unique_user_month UNIQUE(user_id, month_year)
);

-- RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Subscription Policies
CREATE POLICY "Users can view own subscription" ON user_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

-- Usage Policies
CREATE POLICY "Users can view own usage" ON user_usage 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON user_usage 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON user_usage 
  FOR UPDATE USING (auth.uid() = user_id);

-- Core RPC Function: Check Feature Access
CREATE OR REPLACE FUNCTION check_feature_access(feature_id TEXT)
RETURNS JSONB AS $$
DECLARE
  user_uuid UUID := auth.uid();
  subscription_record RECORD;
  current_month TEXT := to_char(NOW(), 'YYYY-MM');
  current_usage INTEGER := 0;
  usage_limit INTEGER;
  has_feature_access BOOLEAN := FALSE;
BEGIN
  -- Ensure user is authenticated
  IF user_uuid IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'error', 'Authentication required'
    );
  END IF;

  -- Get user's subscription
  SELECT * INTO subscription_record
  FROM user_subscriptions 
  WHERE user_id = user_uuid;
  
  -- Default to free tier if no subscription
  IF subscription_record IS NULL THEN
    subscription_record.features := '{
      "ai_conversations": true,
      "export_loops": true,
      "advanced_analytics": false,
      "team_features": false,
      "priority_support": false
    }'::jsonb;
    subscription_record.limits := '{
      "loops_per_month": -1,
      "ai_requests_per_month": -1,
      "file_uploads_per_month": 0,
      "custom_prompts_per_month": 0,
      "export_operations_per_month": -1
    }'::jsonb;
    subscription_record.status := 'active';
    subscription_record.plan_id := 'free';
  END IF;

  -- Check if subscription is active
  IF subscription_record.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'requires_upgrade', true,
      'error', 'Subscription not active'
    );
  END IF;

  -- Check if feature is included in plan
  has_feature_access := COALESCE((subscription_record.features->>feature_id)::boolean, false);
  
  IF NOT has_feature_access THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'requires_upgrade', true,
      'plan_id', subscription_record.plan_id,
      'error', 'Feature not available in current plan'
    );
  END IF;

  -- Get usage limit and current usage
  usage_limit := (subscription_record.limits->>format('%s_per_month', feature_id))::INTEGER;
  
  -- Get current usage from user_usage table
  SELECT COALESCE(
    CASE feature_id
      WHEN 'loops_created' THEN loops_created
      WHEN 'ai_conversations' THEN ai_requests_made
      WHEN 'export_loops' THEN export_operations
      WHEN 'file_uploads' THEN file_uploads
      WHEN 'custom_prompts' THEN custom_prompts_used
      ELSE (features_accessed->>feature_id)::INTEGER
    END, 0
  ) INTO current_usage
  FROM user_usage 
  WHERE user_id = user_uuid AND month_year = current_month;

  -- Check usage limits (unlimited if -1)
  IF usage_limit > 0 AND current_usage >= usage_limit THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'requires_upgrade', false,
      'usage_limit_reached', true,
      'current_usage', current_usage,
      'limit', usage_limit,
      'error', 'Monthly usage limit reached'
    );
  END IF;

  -- Access granted
  RETURN jsonb_build_object(
    'has_access', true,
    'feature_id', feature_id,
    'current_usage', current_usage,
    'limit', usage_limit,
    'remaining', CASE WHEN usage_limit = -1 THEN -1 ELSE GREATEST(0, usage_limit - current_usage) END,
    'plan_id', subscription_record.plan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Core RPC Function: Get Subscription Summary
CREATE OR REPLACE FUNCTION get_subscription_summary()
RETURNS JSONB AS $$
DECLARE
  user_uuid UUID := auth.uid();
  subscription_record RECORD;
  usage_record RECORD;
  current_month TEXT := to_char(NOW(), 'YYYY-MM');
BEGIN
  -- Ensure user is authenticated
  IF user_uuid IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required');
  END IF;

  -- Get subscription
  SELECT * INTO subscription_record
  FROM user_subscriptions 
  WHERE user_id = user_uuid;
  
  -- Get current month usage
  SELECT * INTO usage_record
  FROM user_usage
  WHERE user_id = user_uuid AND month_year = current_month;

  -- Return summary
  RETURN jsonb_build_object(
    'subscription', row_to_json(subscription_record),
    'current_usage', row_to_json(usage_record),
    'month', current_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Core RPC Function: Increment Usage
CREATE OR REPLACE FUNCTION increment_usage(
  feature_id TEXT,
  usage_amount INTEGER DEFAULT 1,
  current_month TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  user_uuid UUID := auth.uid();
  month_key TEXT := COALESCE(current_month, to_char(NOW(), 'YYYY-MM'));
  current_usage JSONB;
  subscription_limits JSONB;
  current_count INTEGER;
  usage_limit INTEGER;
  column_name TEXT;
BEGIN
  -- Ensure user is authenticated
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user's subscription limits
  SELECT limits INTO subscription_limits 
  FROM user_subscriptions 
  WHERE user_id = user_uuid AND status IN ('active', 'trialing');
  
  IF subscription_limits IS NULL THEN
    -- Default to free tier limits if no subscription found
    subscription_limits := '{
      "loops_per_month": -1,
      "ai_requests_per_month": -1,
      "file_uploads_per_month": 0,
      "custom_prompts_per_month": 0,
      "export_operations_per_month": -1
    }'::jsonb;
  END IF;

  -- Map feature_id to database column and limit key
  column_name := CASE feature_id
    WHEN 'loops_created' THEN 'loops_created'
    WHEN 'ai_conversations' THEN 'ai_requests_made'
    WHEN 'export_loops' THEN 'export_operations'
    WHEN 'file_uploads' THEN 'file_uploads'
    WHEN 'custom_prompts' THEN 'custom_prompts_used'
    ELSE NULL
  END;

  -- Get usage limit for this feature
  usage_limit := (subscription_limits ->> (feature_id || '_per_month'))::INTEGER;
  IF usage_limit IS NULL THEN
    usage_limit := -1; -- Default to unlimited
  END IF;

  -- Upsert usage record
  INSERT INTO user_usage (user_id, month_year, features_accessed)
  VALUES (user_uuid, month_key, jsonb_build_object(feature_id, usage_amount))
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    features_accessed = COALESCE(user_usage.features_accessed, '{}'::jsonb) || 
                       jsonb_build_object(feature_id, 
                         COALESCE((user_usage.features_accessed->>feature_id)::integer, 0) + usage_amount
                       ),
    updated_at = NOW();

  -- Update specific column if mapped
  IF column_name IS NOT NULL THEN
    EXECUTE format('
      UPDATE user_usage SET %I = COALESCE(%I, 0) + %L 
      WHERE user_id = %L AND month_year = %L',
      column_name, column_name, usage_amount, user_uuid, month_key
    );
  END IF;

  -- Get current usage count
  EXECUTE format('
    SELECT COALESCE(%I, 0) FROM user_usage 
    WHERE user_id = %L AND month_year = %L',
    COALESCE(column_name, 'loops_created'), user_uuid, month_key
  ) INTO current_count;

  -- Return updated usage data
  SELECT features_accessed INTO current_usage 
  FROM user_usage 
  WHERE user_id = user_uuid AND month_year = month_key;

  RETURN jsonb_build_object(
    'success', true,
    'feature_id', feature_id,
    'current_usage', current_count,
    'limit', usage_limit,
    'remaining', CASE WHEN usage_limit = -1 THEN -1 ELSE GREATEST(0, usage_limit - current_count) END,
    'all_usage', current_usage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;