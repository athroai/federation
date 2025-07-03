-- QUICK FIX: Ensure Dave has full access
-- Run this in Supabase SQL Editor

-- Create or update Dave's profile with full tier
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

-- Verify it worked
SELECT 
  u.email,
  u.id,
  p.user_tier,
  p.updated_at
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'dave@nexastream.co.uk'; 