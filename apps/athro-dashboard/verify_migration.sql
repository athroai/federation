-- 🔍 VERIFICATION SCRIPT - Run this in Supabase SQL Editor to check migration status

-- Check if user_preferences table exists and has the right structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
ORDER BY ordinal_position;

-- Check if profiles table has all required columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'user_tier', 
  'email', 
  'preferred_name', 
  'last_activity_reset_date', 
  'spent_today_gbp'
)
ORDER BY column_name;

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_preferences',
  'subject_preferences', 
  'profiles',
  'calendar_events',
  'wellbeing_data',
  'study_sessions'
)
ORDER BY table_name;

-- Check RLS policies on user_preferences
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_preferences';

-- Test if we can query user_preferences (should work without errors)
SELECT COUNT(*) as user_preferences_count FROM user_preferences;

-- Test if we can query profiles (should work without errors)  
SELECT COUNT(*) as profiles_count FROM profiles;

-- Show current user ID for testing
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN 'Not authenticated'
    ELSE 'Authenticated'
  END as auth_status; 