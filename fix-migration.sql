-- Fix Migration - Drop existing functions and recreate
-- Run this first, then run the full migration

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS cleanup_expired_notifications();
DROP FUNCTION IF EXISTS cleanup_old_usage_data();
DROP FUNCTION IF EXISTS check_feature_access(text);
DROP FUNCTION IF EXISTS get_subscription_summary();
DROP FUNCTION IF EXISTS increment_usage(text, integer, text);

-- Drop existing tables if they exist (be careful with this in production)
-- DROP TABLE IF EXISTS user_activity_log CASCADE;
-- DROP TABLE IF EXISTS payment_notifications CASCADE;
-- DROP TABLE IF EXISTS user_licenses CASCADE;
-- DROP TABLE IF EXISTS user_usage CASCADE;
-- DROP TABLE IF EXISTS user_subscriptions CASCADE;

-- Now run the full migration file after this