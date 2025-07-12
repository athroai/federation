-- Check if columns exist and add them if missing

-- Add 'back' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'back') THEN
        ALTER TABLE flashcards ADD COLUMN back TEXT;
        -- Update existing rows to have a default value
        UPDATE flashcards SET back = 'No answer provided' WHERE back IS NULL;
        -- Make it NOT NULL after updating existing rows
        ALTER TABLE flashcards ALTER COLUMN back SET NOT NULL;
    END IF;
END $$;

-- Add 'deleted' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'deleted') THEN
        ALTER TABLE flashcards ADD COLUMN deleted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add 'deleted_at' column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcards' AND column_name = 'deleted_at') THEN
        ALTER TABLE flashcards ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create index on deleted column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'flashcards' AND indexname = 'idx_flashcards_deleted') THEN
        CREATE INDEX idx_flashcards_deleted ON flashcards(deleted);
    END IF;
END $$;

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'flashcards'
ORDER BY ordinal_position; 
 
 
 