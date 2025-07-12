-- Fix flashcards table to use the column names expected by the code

-- First, add the 'front' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'front') THEN
        -- Add front column and copy data from question
        ALTER TABLE flashcards ADD COLUMN front TEXT;
        UPDATE flashcards SET front = COALESCE(question, 'No question provided');
        ALTER TABLE flashcards ALTER COLUMN front SET NOT NULL;
    END IF;
END $$;

-- Ensure 'back' column has the data from 'answer' if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcards' AND column_name = 'answer') THEN
        -- Copy answer data to back column
        UPDATE flashcards SET back = COALESCE(answer, 'No answer provided') WHERE back IS NULL;
    END IF;
END $$;

-- Add missing columns that the code expects
DO $$ 
BEGIN
    -- Add repetition_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'repetition_count') THEN
        ALTER TABLE flashcards ADD COLUMN repetition_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add difficulty if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'difficulty') THEN
        ALTER TABLE flashcards ADD COLUMN difficulty TEXT DEFAULT 'UNRATED';
    END IF;
    
    -- Add last_reviewed if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'last_reviewed') THEN
        ALTER TABLE flashcards ADD COLUMN last_reviewed TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add next_review if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'next_review') THEN
        ALTER TABLE flashcards ADD COLUMN next_review TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add review_interval if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'review_interval') THEN
        ALTER TABLE flashcards ADD COLUMN review_interval TEXT;
    END IF;
END $$;

-- Optional: Drop the old columns after verification
-- Only uncomment and run these after verifying the data has been copied successfully
-- ALTER TABLE flashcards DROP COLUMN IF EXISTS question;
-- ALTER TABLE flashcards DROP COLUMN IF EXISTS answer;
-- ALTER TABLE flashcards DROP COLUMN IF EXISTS review_status;

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'flashcards'
ORDER BY ordinal_position; 
 
 
 