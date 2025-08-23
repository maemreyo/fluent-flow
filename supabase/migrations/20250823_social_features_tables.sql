-- Social Features Database Schema
-- Creates tables for comprehensive social functionality

-- Learning Goals Table
CREATE TABLE IF NOT EXISTS learning_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('practice_time', 'streak', 'vocabulary', 'sessions', 'videos', 'proficiency')),
  title TEXT NOT NULL,
  description TEXT,
  target BIGINT NOT NULL CHECK (target > 0),
  current BIGINT DEFAULT 0,
  unit TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_completion CHECK (
    (is_completed = FALSE AND completed_at IS NULL) OR 
    (is_completed = TRUE AND completed_at IS NOT NULL)
  )
);

-- Users Social Profiles Table
CREATE TABLE IF NOT EXISTS user_social_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar TEXT,
  language_preferences JSONB NOT NULL DEFAULT '{"learning": [], "native": []}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT FALSE,
  preferences JSONB NOT NULL DEFAULT '{"publicProfile": true, "shareProgress": true, "acceptChallenges": true, "showOnLeaderboard": true}',
  stats JSONB NOT NULL DEFAULT '{"totalPracticeTime": 0, "totalSessions": 0, "currentStreak": 0, "longestStreak": 0, "videosCompleted": 0, "averageSessionTime": 0, "vocabularyLearned": 0, "recordingsMade": 0, "challengesCompleted": 0, "friendsHelped": 0}',
  level_data JSONB NOT NULL DEFAULT '{"current": 1, "name": "Newbie Explorer", "xp": 0, "xpToNext": 100, "totalXp": 0, "icon": "🌱", "color": "#10b981"}',
  achievements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Groups Table
CREATE TABLE IF NOT EXISTS study_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  max_members INTEGER DEFAULT 20 CHECK (max_members > 0),
  is_private BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  current_challenge_id UUID,
  stats JSONB DEFAULT '{"totalSessions": 0, "avgProgress": 0, "mostActiveDay": "Monday"}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Group Members Table
CREATE TABLE IF NOT EXISTS study_group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  contribution INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(group_id, user_id)
);

-- Group Challenges Table
CREATE TABLE IF NOT EXISTS group_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('practice_time', 'streak', 'vocabulary', 'sessions', 'videos')),
  target INTEGER NOT NULL CHECK (target > 0),
  duration INTEGER NOT NULL CHECK (duration > 0), -- in days
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  rewards JSONB NOT NULL DEFAULT '{"xp": 0}',
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')) DEFAULT 'upcoming',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Challenge Participants Table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar TEXT,
  progress INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(challenge_id, user_id)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'achievement', 'challenge_update', 'video_share', 'system')) DEFAULT 'text',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reactions JSONB DEFAULT '[]',
  reply_to UUID REFERENCES chat_messages(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Notifications Table
CREATE TABLE IF NOT EXISTS social_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'challenge_invite', 'group_invite', 'achievement', 'message', 'leaderboard')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements Table (for better querying than JSONB)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('milestone', 'streak', 'social', 'challenge', 'helping')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_goals_user_id ON learning_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_goals_type ON learning_goals(type);
CREATE INDEX IF NOT EXISTS idx_learning_goals_deadline ON learning_goals(deadline) WHERE deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_social_profiles_username ON user_social_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_social_profiles_online ON user_social_profiles(is_online) WHERE is_online = TRUE;

CREATE INDEX IF NOT EXISTS idx_study_groups_language ON study_groups(language);
CREATE INDEX IF NOT EXISTS idx_study_groups_level ON study_groups(level);
CREATE INDEX IF NOT EXISTS idx_study_groups_private ON study_groups(is_private);

CREATE INDEX IF NOT EXISTS idx_study_group_members_group_id ON study_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_user_id ON study_group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_group_challenges_group_id ON group_challenges(group_id);
CREATE INDEX IF NOT EXISTS idx_group_challenges_status ON group_challenges(status);
CREATE INDEX IF NOT EXISTS idx_group_challenges_dates ON group_challenges(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON challenge_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(type);

CREATE INDEX IF NOT EXISTS idx_social_notifications_user_id ON social_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_social_notifications_read ON social_notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_social_notifications_expires ON social_notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(type);

-- RLS Policies
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Learning Goals Policies
CREATE POLICY "Users can view own goals" ON learning_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON learning_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON learning_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON learning_goals FOR DELETE USING (auth.uid() = user_id);

-- Social Profiles Policies
CREATE POLICY "Users can view public profiles" ON user_social_profiles FOR SELECT USING (
  auth.uid() = user_id OR 
  (preferences->>'publicProfile')::boolean = true
);
CREATE POLICY "Users can insert own profile" ON user_social_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_social_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Study Groups Policies
CREATE POLICY "Users can view public groups or own groups" ON study_groups FOR SELECT USING (
  is_private = false OR 
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM study_group_members WHERE group_id = id AND user_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON study_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group owners can update groups" ON study_groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Group owners can delete groups" ON study_groups FOR DELETE USING (auth.uid() = created_by);

-- Study Group Members Policies
CREATE POLICY "Users can view group members" ON study_group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM study_groups WHERE id = group_id AND (
    is_private = false OR 
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM study_group_members sgm WHERE sgm.group_id = group_id AND sgm.user_id = auth.uid())
  ))
);
CREATE POLICY "Users can join groups" ON study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON study_group_members FOR DELETE USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Group members can view messages" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM study_group_members WHERE group_id = chat_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY "Group members can send messages" ON chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM study_group_members WHERE group_id = chat_messages.group_id AND user_id = auth.uid())
);

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON social_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON social_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON social_notifications FOR UPDATE USING (auth.uid() = user_id);

-- Achievements Policies
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- Challenge Policies
CREATE POLICY "Group members can view challenges" ON group_challenges FOR SELECT USING (
  EXISTS (SELECT 1 FROM study_group_members WHERE group_id = group_challenges.group_id AND user_id = auth.uid())
);
CREATE POLICY "Group members can create challenges" ON group_challenges FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (SELECT 1 FROM study_group_members WHERE group_id = group_challenges.group_id AND user_id = auth.uid())
);

CREATE POLICY "Challenge participants can view participation" ON challenge_participants FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM group_challenges gc 
          JOIN study_group_members sgm ON gc.group_id = sgm.group_id 
          WHERE gc.id = challenge_id AND sgm.user_id = auth.uid())
);
CREATE POLICY "Users can join challenges" ON challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_learning_goals_updated_at BEFORE UPDATE ON learning_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_social_profiles_updated_at BEFORE UPDATE ON user_social_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at BEFORE UPDATE ON study_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_challenges_updated_at BEFORE UPDATE ON group_challenges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate user streak from practice_statistics
CREATE OR REPLACE FUNCTION calculate_user_streak(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    current_streak INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    has_practice BOOLEAN;
BEGIN
    -- Check if user practiced today, if not start from yesterday
    SELECT EXISTS(
        SELECT 1 FROM practice_statistics 
        WHERE user_id = user_uuid AND date = CURRENT_DATE AND sessions_count > 0
    ) INTO has_practice;
    
    IF NOT has_practice THEN
        check_date := CURRENT_DATE - INTERVAL '1 day';
    END IF;
    
    -- Count consecutive days backwards
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM practice_statistics 
            WHERE user_id = user_uuid AND date = check_date AND sessions_count > 0
        ) INTO has_practice;
        
        IF NOT has_practice THEN
            EXIT;
        END IF;
        
        current_streak := current_streak + 1;
        check_date := check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user social stats from practice data
CREATE OR REPLACE FUNCTION sync_user_social_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_stats JSONB;
    current_streak INTEGER;
    longest_streak INTEGER;
    total_time BIGINT;
    total_sessions BIGINT;
    avg_duration NUMERIC;
BEGIN
    -- Calculate current streak
    current_streak := calculate_user_streak(NEW.user_id);
    
    -- Get aggregated stats
    SELECT 
        COALESCE(SUM(total_practice_time), 0),
        COALESCE(SUM(sessions_count), 0),
        COALESCE(AVG(avg_session_duration), 0)
    INTO total_time, total_sessions, avg_duration
    FROM practice_statistics 
    WHERE user_id = NEW.user_id;
    
    -- Calculate longest streak (simplified - would need more complex logic for accuracy)
    longest_streak := GREATEST(current_streak, COALESCE((
        SELECT (stats->>'longestStreak')::INTEGER 
        FROM user_social_profiles 
        WHERE user_id = NEW.user_id
    ), 0));
    
    -- Update social profile stats
    UPDATE user_social_profiles 
    SET 
        stats = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        jsonb_set(stats, '{totalPracticeTime}', to_jsonb(total_time)),
                        '{totalSessions}', to_jsonb(total_sessions)
                    ),
                    '{currentStreak}', to_jsonb(current_streak)
                ),
                '{longestStreak}', to_jsonb(longest_streak)
            ),
            '{averageSessionTime}', to_jsonb(ROUND(avg_duration))
        ),
        last_seen = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-sync social stats when practice stats change
CREATE TRIGGER sync_social_stats_on_practice_update 
    AFTER INSERT OR UPDATE ON practice_statistics
    FOR EACH ROW EXECUTE FUNCTION sync_user_social_stats();

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM social_notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;