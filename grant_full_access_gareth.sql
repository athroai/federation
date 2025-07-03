-- GRANT FULL ACCESS TO GARETH.MILTON@ME.COM
-- This script updates the user tier to 'full' for immediate access to all features

-- First, let's find the user and update their tier
UPDATE profiles 
SET user_tier = 'full',
    updated_at = NOW()
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'gareth.milton@me.com'
);

-- If the profile doesn't exist yet, create it with full access
INSERT INTO profiles (id, user_tier, created_at, updated_at)
SELECT 
  id, 
  'full',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'gareth.milton@me.com'
  AND id NOT IN (SELECT id FROM profiles WHERE id IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET 
  user_tier = 'full',
  updated_at = NOW();

-- Verify the update worked
SELECT 
  u.email,
  u.id as user_id,
  p.user_tier,
  p.updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'gareth.milton@me.com';

-- Show confirmation
SELECT 'SUCCESS: gareth.milton@me.com now has FULL access to all features including calendar scheduling!' as status; 