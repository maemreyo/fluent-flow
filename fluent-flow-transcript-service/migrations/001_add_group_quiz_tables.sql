-- Migration: Add Group Quiz Tables for MVP
-- Description: Add missing tables for group quiz functionality
-- Date: 2025-01-31

-- Add missing columns to study_groups table for MVP
ALTER TABLE study_groups 
ADD COLUMN IF NOT EXISTS group_code VARCHAR(8) UNIQUE,
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing study_groups to have creator_id same as created_by
UPDATE study_groups 
SET creator_id = created_by 
WHERE creator_id IS NULL;

-- Create group quiz sessions table
CREATE TABLE IF NOT EXISTS group_quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  quiz_token VARCHAR(255) NOT NULL,
  quiz_title VARCHAR(255),
  video_url TEXT,
  video_title TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  settings JSONB DEFAULT '{"allowLateJoin": true, "showRealTimeResults": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group quiz results table
CREATE TABLE IF NOT EXISTS group_quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES group_quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name VARCHAR(255),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
  time_taken_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  result_data JSONB DEFAULT '{}'::jsonb,
  UNIQUE(session_id, user_id)
);

-- Create group invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitation_code VARCHAR(12) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_quiz_sessions_group_id ON group_quiz_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_quiz_sessions_status ON group_quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_group_quiz_sessions_scheduled_at ON group_quiz_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_group_quiz_results_session_id ON group_quiz_results(session_id);
CREATE INDEX IF NOT EXISTS idx_group_quiz_results_user_id ON group_quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_code ON group_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_group_code ON study_groups(group_code);

-- Function to generate unique group codes
CREATE OR REPLACE FUNCTION generate_group_code() 
RETURNS VARCHAR(8) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code() 
RETURNS VARCHAR(12) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  result VARCHAR(12) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate group codes
CREATE OR REPLACE FUNCTION set_group_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_code IS NULL OR NEW.group_code = '' THEN
    LOOP
      NEW.group_code := generate_group_code();
      -- Check if code already exists
      PERFORM 1 FROM study_groups WHERE group_code = NEW.group_code AND id != NEW.id;
      IF NOT FOUND THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for group codes
DROP TRIGGER IF EXISTS trigger_set_group_code ON study_groups;
CREATE TRIGGER trigger_set_group_code
  BEFORE INSERT OR UPDATE ON study_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_group_code();

-- Trigger to auto-generate invitation codes
CREATE OR REPLACE FUNCTION set_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invitation_code IS NULL OR NEW.invitation_code = '' THEN
    LOOP
      NEW.invitation_code := generate_invitation_code();
      -- Check if code already exists
      PERFORM 1 FROM group_invitations WHERE invitation_code = NEW.invitation_code AND id != NEW.id;
      IF NOT FOUND THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invitation codes
DROP TRIGGER IF EXISTS trigger_set_invitation_code ON group_invitations;
CREATE TRIGGER trigger_set_invitation_code
  BEFORE INSERT OR UPDATE ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_invitation_code();

-- Update group codes for existing groups
UPDATE study_groups 
SET group_code = generate_group_code() 
WHERE group_code IS NULL;

-- Enable RLS on new tables
ALTER TABLE group_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;