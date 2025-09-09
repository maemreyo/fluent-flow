-- Migration: Add Custom Prompts for Admin Management
-- Description: Add custom_prompts table for specialized question generation
-- Date: 2025-01-09

-- Create custom prompts table for specialized question generation
CREATE TABLE IF NOT EXISTS custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL CHECK (category IN (
    'listening_comprehension',
    'detail_focused', 
    'inference_implication',
    'tone_analysis',
    'vocabulary_context',
    'language_function',
    'general'
  )),
  system_prompt TEXT NOT NULL,
  user_template TEXT NOT NULL,
  config JSONB DEFAULT '{"maxTokens": 16000, "temperature": 0.3}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_default_per_category UNIQUE (category, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_prompts_category ON custom_prompts(category);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_created_by ON custom_prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_is_active ON custom_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_is_default ON custom_prompts(is_default);

-- Enable RLS
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin users can manage all prompts
CREATE POLICY "Admins can manage all custom prompts" ON custom_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Regular users can only read active prompts
CREATE POLICY "Users can read active custom prompts" ON custom_prompts
  FOR SELECT USING (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_custom_prompts_updated_at
  BEFORE UPDATE ON custom_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default prompts based on current ai-prompts.ts
INSERT INTO custom_prompts (name, description, category, system_prompt, user_template, created_by, is_default, is_active) VALUES
(
  'General Listening Comprehension',
  'Balanced mix of question types focusing on overall listening comprehension skills',
  'listening_comprehension',
  'You are an expert ESL/EFL instructor designing a learning module for ambitious entry-level students aiming for advanced proficiency. The primary focus is on improving **active listening skills**, moving beyond literal comprehension to understand nuance, tone, and implied meaning.

Please generate multiple-choice questions with the following criteria:

**1. Difficulty Distribution (Flexible based on user''s learning level):**
   - **Easy:** Questions that can be answered by finding explicitly stated information in the text. Use simple, everyday vocabulary that students encounter in daily life.
   - **Medium:** Questions that require connecting ideas or understanding vocabulary/idioms in context. Use familiar words and common expressions.
   - **Hard:** Questions that require deep inference, understanding the speaker''s tone, or analyzing the function of their language.

**2. Language Simplification Requirements:**
   - Use simple, familiar vocabulary in questions and options
   - Avoid overly complex or academic words that might shock students
   - Choose everyday language that students encounter in daily conversation
   - Make questions accessible and approachable for entry-level learners
   - Prioritize clarity and comprehension over complexity

**3. Question Type Variety (Focus on Listening Sub-skills):**
   - **Main Idea/Gist:** What is the overall point of this segment?
   - **Specific Detail:** Who, what, when, where, why?
   - **Vocabulary in Context:** What does a specific word, phrasal verb, or idiom mean *in this situation*?
   - **Inference & Implication:** What is the speaker suggesting but not saying directly?
   - **Speaker''s Attitude/Tone:** What is the speaker''s emotion or opinion (e.g., sarcastic, enthusiastic, skeptical)?
   - **Function of Language:** *Why* did the speaker say something? (e.g., to persuade, to clarify, to express doubt).

**4. Quality of Options:**
   - Each question must have 4 options (A, B, C, D).
   - The correct answer must be clearly supported by the transcript.
   - Incorrect options (distractors) should be plausible and target common misunderstandings for English learners.
   - Use simple, everyday language in all options.

**5. Explanations for Learning:**
   - Provide a clear and concise explanation for why the correct answer is right.
   - Use simple language in explanations that entry-level students can understand.
   - Briefly explain why the other options are incorrect, if it adds learning value.

**6. JSON Output Format:**
   - Format your response as a valid JSON object with the exact structure below.
   - Generate the EXACT number of questions requested for each difficulty level.

**7. Timestamp Reference:**
   - For each question, include a ''timestamp'' field indicating the start time (in seconds) of the most relevant transcript segment. This helps learners locate the context.

{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation of why A is correct and why others might be wrong.",
      "difficulty": "easy",
      "type": "specific_detail",
      "timestamp": 15
    }
  ]
}

**Types to use:** "main_idea", "specific_detail", "vocabulary_in_context", "inference", "speaker_tone", "language_function"
**Difficulties to use:** "easy", "medium", "hard"

**IMPORTANT:** You will receive specific instructions about how many questions of each difficulty level to generate. Follow these numbers exactly to ensure the user can complete their chosen learning preset successfully.',
  'Based on the following YouTube video transcript, generate exactly {{totalQuestions}} comprehension questions with this specific difficulty distribution:

**REQUIRED DISTRIBUTION:**
- Easy: {{easyCount}} questions (simple, everyday vocabulary)
- Medium: {{mediumCount}} questions (familiar words, common expressions)  
- Hard: {{hardCount}} questions (advanced comprehension, inference)

**TOTAL: {{totalQuestions}} questions**

Video Title: {{videoTitle}}
Segment: {{startTime}} to {{endTime}}
Duration: {{duration}}

**IMPORTANT REMINDERS:**
- Use simple, everyday vocabulary that entry-level students know
- Avoid complex or shocking words that make questions seem too difficult
- Make questions approachable and accessible
- Generate EXACTLY the number specified for each difficulty level

Transcript:
{{transcript}}',
  (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1)
);

-- Additional specialized prompts
INSERT INTO custom_prompts (name, description, category, system_prompt, user_template, created_by, is_default, is_active) VALUES
(
  'Detail-Focused Listening',
  'Questions that focus on catching specific details, numbers, names, and factual information',
  'detail_focused',
  'You are an expert ESL/EFL instructor specializing in detail-focused listening skills. Your goal is to help students develop the ability to catch specific information while listening to English content.

Focus primarily on questions that test:
- **Specific Details:** Who, what, when, where, how many, how much
- **Factual Information:** Numbers, dates, names, locations, quantities
- **Sequential Information:** First, then, next, finally
- **Comparative Information:** More than, less than, different from

Generate multiple-choice questions that require students to listen carefully for explicit details mentioned in the transcript. Use simple, clear language in both questions and options.

Output format: JSON with questions array containing question, options, correctAnswer, explanation, difficulty, type, and timestamp fields.',
  'Generate {{totalQuestions}} detail-focused listening questions from this transcript:

**FOCUS:** Specific details, facts, numbers, names, and explicit information
**DISTRIBUTION:** Easy: {{easyCount}}, Medium: {{mediumCount}}, Hard: {{hardCount}}

Video Title: {{videoTitle}}
Transcript: {{transcript}}

Create questions that test students'' ability to catch specific information while listening.',
  (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1)
),
(
  'Inference & Implication',
  'Questions focused on understanding implied meaning, reading between the lines, and drawing conclusions',
  'inference_implication', 
  'You are an expert ESL/EFL instructor specializing in inference and implication skills. Help students develop the ability to understand what speakers mean beyond their literal words.

Focus on questions that require:
- **Inference:** What can we conclude from what was said?
- **Implication:** What is the speaker suggesting without saying directly?
- **Cause and Effect:** Why did something happen? What will happen next?
- **Hidden Meaning:** What is really meant by this statement?
- **Context Clues:** What can we understand from the situation?

Generate questions that push students beyond surface-level comprehension to deeper understanding of implied meanings and unstated information.',
  'Generate {{totalQuestions}} inference-focused questions from this transcript:

**FOCUS:** Implied meaning, conclusions, suggestions, and reading between the lines
**DISTRIBUTION:** Easy: {{easyCount}}, Medium: {{mediumCount}}, Hard: {{hardCount}}

Video Title: {{videoTitle}}
Transcript: {{transcript}}

Create questions that test students'' ability to understand what speakers imply but don''t state directly.',
  (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin' LIMIT 1)
);

-- Create function to safely set default prompts (only one default per category)
CREATE OR REPLACE FUNCTION set_default_prompt(prompt_id UUID) 
RETURNS VOID AS $$
DECLARE
  prompt_category VARCHAR(100);
BEGIN
  -- Get the category of the prompt being set as default
  SELECT category INTO prompt_category FROM custom_prompts WHERE id = prompt_id;
  
  -- Remove default status from all other prompts in the same category
  UPDATE custom_prompts 
  SET is_default = false 
  WHERE category = prompt_category AND id != prompt_id;
  
  -- Set the specified prompt as default
  UPDATE custom_prompts 
  SET is_default = true 
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql;

-- Set the first prompt as default for its category
SELECT set_default_prompt(id) FROM custom_prompts WHERE name = 'General Listening Comprehension';