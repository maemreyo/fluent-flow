-- Migration: Add group invitations system
-- This migration adds support for inviting members to study groups

-- Create group invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invite_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(group_id, email)
);

-- Add RLS policies for group_invitations
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations to groups they're members of
CREATE POLICY "view_group_invitations_as_member" ON group_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm 
      WHERE sgm.group_id = group_invitations.group_id 
      AND sgm.user_id = auth.uid()
    )
  );

-- Policy: Users can view their own email invitations
CREATE POLICY "view_own_email_invitations" ON group_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Group owners/admins can create invitations
CREATE POLICY "create_group_invitations" ON group_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_group_members sgm 
      WHERE sgm.group_id = group_invitations.group_id 
      AND sgm.user_id = auth.uid() 
      AND sgm.role IN ('owner', 'admin')
    )
  );

-- Policy: Invited users can update their own invitations (accept/decline)
CREATE POLICY "update_own_invitations" ON group_invitations
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Group owners/admins can update invitations they created
CREATE POLICY "update_group_invitations_as_admin" ON group_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm 
      WHERE sgm.group_id = group_invitations.group_id 
      AND sgm.user_id = auth.uid() 
      AND sgm.role IN ('owner', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON group_invitations(email);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON group_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_expires_at ON group_invitations(expires_at);

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- Update expired invitations
  UPDATE group_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
  AND expires_at < now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the expiration function periodically
-- Note: This is a simple approach. In production, you might want to use a scheduled job instead
CREATE OR REPLACE FUNCTION trigger_expire_invitations()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM expire_old_invitations();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT to check for expired invitations
CREATE TRIGGER check_expired_invitations
  AFTER INSERT ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_expire_invitations();