-- Migration: Clean RLS Policies - Properly handle existing policies
-- Description: Clean up all existing policies and create simple non-recursive ones
-- Date: 2025-01-31

-- Drop ALL existing policies on study_groups table
DROP POLICY IF EXISTS "Users can view public groups" ON study_groups;
DROP POLICY IF EXISTS "Users can create groups" ON study_groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON study_groups;
DROP POLICY IF EXISTS "Group owners can delete groups" ON study_groups;
DROP POLICY IF EXISTS "Members can view their private groups" ON study_groups;
DROP POLICY IF EXISTS "Creators can update their groups" ON study_groups;
DROP POLICY IF EXISTS "Creators can delete their groups" ON study_groups;

-- Drop ALL existing policies on study_group_members table
DROP POLICY IF EXISTS "Users can view their group memberships" ON study_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
DROP POLICY IF EXISTS "Group owners can manage members" ON study_group_members;
DROP POLICY IF EXISTS "Anyone can view group memberships" ON study_group_members;
DROP POLICY IF EXISTS "Users can manage their own memberships" ON study_group_members;

-- Create simple, non-recursive policies for study_group_members
CREATE POLICY "view_group_memberships" ON study_group_members
  FOR SELECT USING (true);

CREATE POLICY "manage_own_memberships" ON study_group_members
  FOR ALL USING (user_id = auth.uid());

-- Create simple, non-recursive policies for study_groups
CREATE POLICY "view_all_groups" ON study_groups
  FOR SELECT USING (true);

CREATE POLICY "create_groups" ON study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "update_own_groups" ON study_groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "delete_own_groups" ON study_groups
  FOR DELETE USING (auth.uid() = created_by);