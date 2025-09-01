-- Add group session support to existing tables
-- Extend group_quiz_sessions table for deep integration

ALTER TABLE group_quiz_sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'scheduled';
ALTER TABLE group_quiz_sessions ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);
ALTER TABLE group_quiz_sessions ADD COLUMN IF NOT EXISTS questions_data JSONB;
ALTER TABLE group_quiz_sessions ADD COLUMN IF NOT EXISTS loop_data JSONB;

-- Add check constraint for session types
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_quiz_sessions_session_type_check'
  ) THEN
    ALTER TABLE group_quiz_sessions 
    ADD CONSTRAINT group_quiz_sessions_session_type_check 
    CHECK (session_type IN ('instant', 'scheduled', 'recurring'));
  END IF;
END $$;

-- Create session participation tracking table
CREATE TABLE IF NOT EXISTS group_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES group_quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  responses JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_session_participants_session_id 
ON group_session_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_group_session_participants_user_id 
ON group_session_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_group_quiz_sessions_share_token 
ON group_quiz_sessions(share_token) WHERE share_token IS NOT NULL;

-- RLS policies for group_session_participants
ALTER TABLE group_session_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants of groups they belong to
DROP POLICY IF EXISTS "Users can view group session participants" ON group_session_participants;
CREATE POLICY "Users can view group session participants" ON group_session_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_group_members sgm
    JOIN group_quiz_sessions gqs ON gqs.group_id = sgm.group_id
    WHERE gqs.id = group_session_participants.session_id
    AND sgm.user_id = auth.uid()
  )
);

-- Users can insert their own participation records
DROP POLICY IF EXISTS "Users can join group sessions" ON group_session_participants;
CREATE POLICY "Users can join group sessions" ON group_session_participants
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM study_group_members sgm
    JOIN group_quiz_sessions gqs ON gqs.group_id = sgm.group_id
    WHERE gqs.id = group_session_participants.session_id
    AND sgm.user_id = auth.uid()
  )
);

-- Users can update their own participation records
DROP POLICY IF EXISTS "Users can update their own participation" ON group_session_participants;
CREATE POLICY "Users can update their own participation" ON group_session_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_session_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_group_session_participants_updated_at ON group_session_participants;
CREATE TRIGGER update_group_session_participants_updated_at
  BEFORE UPDATE ON group_session_participants
  FOR EACH ROW EXECUTE FUNCTION update_group_session_participants_updated_at();

-- Comments for documentation
COMMENT ON TABLE group_session_participants IS 'Tracks individual user participation in group quiz sessions';
COMMENT ON COLUMN group_quiz_sessions.session_type IS 'Type of session: instant, scheduled, or recurring';
COMMENT ON COLUMN group_quiz_sessions.share_token IS 'Links to existing questions token system for deep integration';
COMMENT ON COLUMN group_quiz_sessions.questions_data IS 'Backup of questions data for persistence';
COMMENT ON COLUMN group_quiz_sessions.loop_data IS 'Video loop information from extension';