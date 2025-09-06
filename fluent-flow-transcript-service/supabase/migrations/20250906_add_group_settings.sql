-- Add group management settings
-- Phase 1: Essential Settings (Role Management, Session Control, Enhanced Quiz Settings)

-- Add settings column to study_groups table
ALTER TABLE study_groups 
ADD COLUMN settings JSONB DEFAULT '{}';

-- Add indexes for commonly queried settings
CREATE INDEX idx_study_groups_settings_gin ON study_groups USING gin(settings);

-- Update existing groups with default settings
UPDATE study_groups 
SET settings = jsonb_build_object(
  -- Role Management Settings
  'allowMemberInvitations', false,
  'requireApprovalForJoining', false, 
  'maxAdminCount', 3,
  'adminCanManageMembers', true,
  'adminCanDeleteSessions', true,
  
  -- Session Control Settings
  'onlyAdminsCanCreateSessions', false,
  'maxConcurrentSessions', 5,
  'requireSessionApproval', false,
  'allowQuizRetakes', true,
  
  -- Enhanced Quiz Settings  
  'shuffleQuestions', false,
  'shuffleAnswers', false,
  'showCorrectAnswers', true,
  'defaultQuizTimeLimit', 30,
  'allowSkippingQuestions', false,
  'enforceQuizTimeLimit', false
)
WHERE settings = '{}' OR settings IS NULL;