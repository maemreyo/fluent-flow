-- Migration: Fix RLS Recursion Issues
-- Description: Fix infinite recursion in RLS policies by breaking circular dependencies
-- Date: 2025-01-31

-- First, add policies for study_group_members table (missing from previous migrations)
DROP POLICY IF EXISTS "Users can view their group memberships" ON study_group_members;
CREATE POLICY "Users can view their group memberships" ON study_group_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
CREATE POLICY "Users can join groups" ON study_group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
CREATE POLICY "Users can leave groups" ON study_group_members
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Group owners can manage members" ON study_group_members;
CREATE POLICY "Group owners can manage members" ON study_group_members
  FOR ALL USING (
    -- Allow if user is the subject of the row
    user_id = auth.uid() OR
    -- Allow if user is the creator of the group
    EXISTS (
      SELECT 1 FROM study_groups 
      WHERE id = study_group_members.group_id 
      AND created_by = auth.uid()
    )
  );

-- Fix the problematic study_groups policies to avoid recursion
DROP POLICY IF EXISTS "Users can view public groups" ON study_groups;
CREATE POLICY "Users can view public groups" ON study_groups
  FOR SELECT USING (
    -- Allow public groups
    is_private = false OR 
    -- Allow if user is the creator
    auth.uid() = created_by
    -- Remove the recursive check for now - membership will be checked in application layer
  );

-- Add a separate policy for private groups that users are members of
DROP POLICY IF EXISTS "Members can view their private groups" ON study_groups;
CREATE POLICY "Members can view their private groups" ON study_groups
  FOR SELECT USING (
    is_private = true AND
    id IN (
      SELECT group_id FROM study_group_members WHERE user_id = auth.uid()
    )
  );

-- Update other policies to avoid recursion
DROP POLICY IF EXISTS "Group owners can update groups" ON study_groups;
CREATE POLICY "Group owners can update groups" ON study_groups
  FOR UPDATE USING (auth.uid() = created_by);

-- Ensure group_code is populated with a unique value for existing groups
UPDATE study_groups 
SET group_code = UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8))
WHERE group_code IS NULL;