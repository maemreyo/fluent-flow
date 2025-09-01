-- Migration: Simple RLS Fix - Remove Circular Dependencies
-- Description: Simplify RLS policies to completely avoid circular references
-- Date: 2025-01-31

-- Drop all existing policies that could cause recursion
DROP POLICY IF EXISTS "Users can view their group memberships" ON study_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON study_group_members;
DROP POLICY IF EXISTS "Group owners can manage members" ON study_group_members;
DROP POLICY IF EXISTS "Users can view public groups" ON study_groups;
DROP POLICY IF EXISTS "Members can view their private groups" ON study_groups;

-- Simple, non-recursive policies for study_group_members
CREATE POLICY "Anyone can view group memberships" ON study_group_members
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own memberships" ON study_group_members
  FOR ALL USING (user_id = auth.uid());

-- Simple, non-recursive policies for study_groups
CREATE POLICY "Anyone can view all groups" ON study_groups
  FOR SELECT USING (true);

CREATE POLICY "Users can create groups" ON study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their groups" ON study_groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their groups" ON study_groups
  FOR DELETE USING (auth.uid() = created_by);