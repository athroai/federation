-- FIX DAVE'S PROFILE ACCESS ISSUE
-- User: dave@nexastream.co.uk
-- Issue: Profile query returning 0 rows despite user existing

-- Step 1: Check if user exists in auth.users
SELECT 
  'User exists in auth.users' as status,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'dave@nexastream.co.uk';

-- Step 2: Check if profile exists in profiles table
SELECT 
  'Profile exists in profiles table' as status,
  id,
  user_tier,
  email,
  created_at,
  updated_at
FROM profiles 
WHERE id = (SELECT id FROM auth.users WHERE email = 'dave@nexastream.co.uk');

-- Step 3: Create/Update profile with FULL access
INSERT INTO profiles (id, user_tier, email, created_at, updated_at)
SELECT 
  id,
  'full',
  email,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'dave@nexastream.co.uk'
ON CONFLICT (id) DO UPDATE SET 
  user_tier = 'full',
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 4: Verify the fix worked
SELECT 
  'VERIFICATION: Dave now has full access' as status,
  u.email,
  u.id as user_id,
  p.user_tier,
  p.created_at,
  p.updated_at
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'dave@nexastream.co.uk';

-- Step 5: Check RLS policies on profiles table
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Step 6: Show all RLS policies on profiles table
SELECT 
  'RLS Policies on profiles table' as info,
  pol.polname as policy_name,
  pol.polpermissive as permissive,
  pol.polroles as roles,
  pol.polcmd as command,
  pol.polqual as using_expression,
  pol.polwithcheck as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'profiles' AND pn.nspname = 'public'; 