-- Migration: Add group join requests system
-- This migration adds support for approval-based group joining

-- Create group join requests table
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  UNIQUE(group_id, user_id)
);

-- Add RLS policies for group_join_requests
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own join requests
CREATE POLICY "view_own_join_requests" ON group_join_requests
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Group owners/admins can view requests for their groups
CREATE POLICY "view_group_join_requests_as_admin" ON group_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm 
      WHERE sgm.group_id = group_join_requests.group_id 
      AND sgm.user_id = auth.uid() 
      AND sgm.role IN ('owner', 'admin')
    )
  );

-- Policy: Authenticated users can create join requests
CREATE POLICY "create_join_requests" ON group_join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Group owners/admins can update requests (approve/reject)
CREATE POLICY "update_join_requests_as_admin" ON group_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm 
      WHERE sgm.group_id = group_join_requests.group_id 
      AND sgm.user_id = auth.uid() 
      AND sgm.role IN ('owner', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON group_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_requested_at ON group_join_requests(requested_at);