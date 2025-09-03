-- Add answers_data column to group_quiz_results table
ALTER TABLE group_quiz_results 
ADD COLUMN IF NOT EXISTS answers_data JSONB;