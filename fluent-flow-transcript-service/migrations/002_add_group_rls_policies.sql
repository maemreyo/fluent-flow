-- Migration: Add RLS Policies for Group Quiz Tables
-- Description: Add Row Level Security policies for the new group quiz tables
-- Date: 2025-01-31

-- Study Groups Policies (update existing)
DROP POLICY IF EXISTS "Users can view public groups" ON study_groups;
CREATE POLICY "Users can view public groups" ON study_groups
  FOR SELECT USING (
    is_private = false OR 
    auth.uid() IN (
      SELECT user_id FROM study_group_members WHERE group_id = study_groups.id
    ) OR
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Users can create groups" ON study_groups;  
CREATE POLICY "Users can create groups" ON study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Group owners can update groups" ON study_groups;
CREATE POLICY "Group owners can update groups" ON study_groups
  FOR UPDATE USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM study_group_members 
      WHERE group_id = study_groups.id AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Group owners can delete groups" ON study_groups;
CREATE POLICY "Group owners can delete groups" ON study_groups
  FOR DELETE USING (auth.uid() = created_by);

-- Group Quiz Sessions Policies
CREATE POLICY "Group members can view quiz sessions" ON group_quiz_sessions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM study_group_members WHERE group_id = group_quiz_sessions.group_id
    )
  );

CREATE POLICY "Group owners/admins can create quiz sessions" ON group_quiz_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() IN (
      SELECT user_id FROM study_group_members 
      WHERE group_id = group_quiz_sessions.group_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Group owners/admins can update quiz sessions" ON group_quiz_sessions
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM study_group_members 
      WHERE group_id = group_quiz_sessions.group_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Group owners/admins can delete quiz sessions" ON group_quiz_sessions
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM study_group_members 
      WHERE group_id = group_quiz_sessions.group_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Group Quiz Results Policies
CREATE POLICY "Group members can view quiz results" ON group_quiz_results
  FOR SELECT USING (
    auth.uid() IN (
      SELECT gm.user_id FROM study_group_members gm
      JOIN group_quiz_sessions gqs ON gm.group_id = gqs.group_id
      WHERE gqs.id = group_quiz_results.session_id
    )
  );

CREATE POLICY "Users can insert their own quiz results" ON group_quiz_results
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT gm.user_id FROM study_group_members gm
      JOIN group_quiz_sessions gqs ON gm.group_id = gqs.group_id
      WHERE gqs.id = group_quiz_results.session_id
    )
  );

CREATE POLICY "Users can update their own quiz results" ON group_quiz_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Group Invitations Policies
CREATE POLICY "Group members can view invitations" ON group_invitations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM study_group_members WHERE group_id = group_invitations.group_id
    )
  );

CREATE POLICY "Group owners/admins can create invitations" ON group_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by AND
    auth.uid() IN (
      SELECT user_id FROM study_group_members 
      WHERE group_id = group_invitations.group_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Group owners/admins can update invitations" ON group_invitations
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM study_group_members 
      WHERE group_id = group_invitations.group_id 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Group owners/admins can delete invitations" ON group_invitations
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM study_group_members 
      WHERE group_id = group_invitations.group_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Add public policy for joining groups via invitation
CREATE POLICY "Anyone can view active invitations for joining" ON group_invitations
  FOR SELECT USING (
    is_active = true AND 
    expires_at > NOW() AND 
    current_uses < max_uses
  );