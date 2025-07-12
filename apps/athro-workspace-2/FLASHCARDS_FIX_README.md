# Flashcards Database Schema Fix

## Issue
The flashcards feature is failing because the database schema has different column names than what the application code expects:
- Database has `question` and `answer` columns
- Code expects `front` and `back` columns
- Missing several columns for spaced repetition features

This mismatch causes errors when trying to save or load flashcards.

## Root Cause
The database was created with an older schema that used `question`/`answer` nomenclature, while the current code uses `front`/`back` (standard flashcard terminology).

## Solution

### Quick Fix: Run the Column Fix Script

I've created a script that will:
1. Add the missing `front` column and copy data from `question`
2. Copy data from `answer` to `back` column
3. Add all missing columns for spaced repetition features

Run this SQL script in your Supabase Dashboard:

```bash
# From the athro-workspace-2 directory
psql $DATABASE_URL < fix_flashcards_columns.sql
```

Or via Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix_flashcards_columns.sql`
4. Click "Run"

## Current Schema vs Expected Schema

### Current Database Schema:
- `question` (text) - The front of the card
- `answer` (text) - The back of the card
- `review_status` (text) - Old review tracking

### Expected by Code:
- `front` (text, NOT NULL) - The front of the card
- `back` (text, NOT NULL) - The back of the card
- `repetition_count` (integer, DEFAULT 0) - For spaced repetition
- `difficulty` (text, DEFAULT 'UNRATED') - Card difficulty rating
- `last_reviewed` (timestamp) - When last reviewed
- `next_review` (timestamp) - When to review next
- `review_interval` (text) - Review interval setting
- `deleted` (boolean, DEFAULT false) - Soft delete flag
- `deleted_at` (timestamp) - When soft deleted

## Verification

After running the fix script, verify the schema:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'flashcards'
ORDER BY ordinal_position;
```

You should see both `front` and `back` columns, along with all the spaced repetition columns.

## Migration Notes

The fix script preserves all existing data:
- Data from `question` → `front`
- Data from `answer` → `back`
- Old columns are kept (not dropped) for safety

Once you've verified everything works, you can optionally drop the old columns by uncommenting the DROP statements in the script.

## Prevention

To prevent this in the future:
1. Keep database migrations in sync with code changes
2. Use consistent naming conventions across the codebase
3. Run migrations as part of the deployment process 
 
 
 