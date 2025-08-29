-- SQL script to create user vocabulary learning tables
-- Execute this in Supabase SQL Editor

-- Create user_vocabulary_deck table for storing user's personal vocabulary collection
CREATE TABLE user_vocabulary_deck (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Vocabulary item details
    text text NOT NULL, -- The word or phrase
    item_type text NOT NULL CHECK (item_type IN ('word', 'phrase')), 
    definition text NOT NULL,
    definition_vi text, -- Vietnamese definition
    example text,
    difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    
    -- Word-specific fields
    part_of_speech text, -- Only for words
    pronunciation text, -- Only for words  
    synonyms jsonb DEFAULT '[]'::jsonb, -- Only for words
    antonyms jsonb DEFAULT '[]'::jsonb, -- Only for words
    
    -- Phrase-specific fields
    phrase_type text, -- Only for phrases (idiom, collocation, etc.)
    
    -- Source information
    source_loop_id text, -- Which loop this came from
    frequency integer DEFAULT 1, -- How often it appeared in source
    
    -- SRS fields
    learning_status text NOT NULL DEFAULT 'new' CHECK (learning_status IN ('new', 'learning', 'review', 'mature', 'suspended')),
    ease_factor numeric(3,2) DEFAULT 2.50, -- SM-2 algorithm ease factor
    interval_days integer DEFAULT 1, -- Days until next review
    next_review_date timestamp with time zone DEFAULT now(),
    repetitions integer DEFAULT 0, -- Number of successful repetitions
    
    -- Tracking fields
    times_practiced integer DEFAULT 0,
    times_correct integer DEFAULT 0,
    times_incorrect integer DEFAULT 0,
    last_practiced_at timestamp with time zone,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique vocabulary per user
    UNIQUE(user_id, text, item_type)
);

-- Create user_vocabulary_reviews table for tracking review sessions
CREATE TABLE user_vocabulary_reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    vocabulary_id uuid REFERENCES user_vocabulary_deck(id) ON DELETE CASCADE,
    
    -- Review details
    review_type text NOT NULL CHECK (review_type IN ('flashcard', 'audio', 'spelling', 'contextual')),
    user_response text,
    correct_answer text,
    is_correct boolean NOT NULL,
    
    -- Timing
    response_time_ms integer, -- How long user took to respond
    reviewed_at timestamp with time zone DEFAULT now(),
    
    -- SRS updates applied after this review
    new_ease_factor numeric(3,2),
    new_interval_days integer,
    new_next_review_date timestamp with time zone
);

-- Create user_learning_stats table for tracking user progress
CREATE TABLE user_learning_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Overall stats
    total_words_added integer DEFAULT 0,
    total_phrases_added integer DEFAULT 0,
    words_learned integer DEFAULT 0, -- Status = 'mature'
    phrases_learned integer DEFAULT 0,
    
    -- Streak tracking
    current_streak_days integer DEFAULT 0,
    longest_streak_days integer DEFAULT 0,
    last_practice_date date,
    
    -- Review stats
    total_reviews integer DEFAULT 0,
    correct_reviews integer DEFAULT 0,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_vocabulary_deck_user_id ON user_vocabulary_deck(user_id);
CREATE INDEX idx_user_vocabulary_deck_next_review ON user_vocabulary_deck(user_id, next_review_date) WHERE learning_status IN ('learning', 'review');
CREATE INDEX idx_user_vocabulary_deck_status ON user_vocabulary_deck(user_id, learning_status);
CREATE INDEX idx_user_vocabulary_reviews_vocabulary_id ON user_vocabulary_reviews(vocabulary_id);
CREATE INDEX idx_user_vocabulary_reviews_user_reviewed ON user_vocabulary_reviews(user_id, reviewed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE user_vocabulary_deck ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocabulary_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own vocabulary deck" ON user_vocabulary_deck
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own vocabulary reviews" ON user_vocabulary_reviews
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning stats" ON user_learning_stats
    FOR ALL USING (auth.uid() = user_id);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at timestamp updates
CREATE TRIGGER update_user_vocabulary_deck_updated_at 
    BEFORE UPDATE ON user_vocabulary_deck 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_learning_stats_updated_at 
    BEFORE UPDATE ON user_learning_stats 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create function for incrementing stats (used by the service)
CREATE OR REPLACE FUNCTION increment_user_stat(
    p_user_id uuid,
    p_field text,
    p_increment integer
)
RETURNS void AS $$
BEGIN
    -- Insert or update user stats
    INSERT INTO user_learning_stats (user_id, total_words_added, total_phrases_added, words_learned, phrases_learned)
    VALUES (
        p_user_id,
        CASE WHEN p_field = 'total_words_added' THEN p_increment ELSE 0 END,
        CASE WHEN p_field = 'total_phrases_added' THEN p_increment ELSE 0 END,
        CASE WHEN p_field = 'words_learned' THEN p_increment ELSE 0 END,
        CASE WHEN p_field = 'phrases_learned' THEN p_increment ELSE 0 END
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_words_added = user_learning_stats.total_words_added + 
            CASE WHEN p_field = 'total_words_added' THEN p_increment ELSE 0 END,
        total_phrases_added = user_learning_stats.total_phrases_added + 
            CASE WHEN p_field = 'total_phrases_added' THEN p_increment ELSE 0 END,
        words_learned = user_learning_stats.words_learned + 
            CASE WHEN p_field = 'words_learned' THEN p_increment ELSE 0 END,
        phrases_learned = user_learning_stats.phrases_learned + 
            CASE WHEN p_field = 'phrases_learned' THEN p_increment ELSE 0 END,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;