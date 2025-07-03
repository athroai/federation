-- Manual Tier Fix for finance@nexastream.co.uk
-- Run this in Supabase SQL Editor if the JavaScript fix fails

-- First, check current user status
SELECT 
  id, 
  email, 
  user_tier, 
  stripe_customer_id, 
  stripe_subscription_id,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'finance@nexastream.co.uk';

-- Update the user tier to 'full'
UPDATE profiles 
SET 
  user_tier = 'full',
  updated_at = NOW()
WHERE email = 'finance@nexastream.co.uk';

-- Also update wellbeing table (if it exists)
INSERT INTO wellbeing (user_id, tier, updated_at) 
SELECT id, 'full', NOW()
FROM profiles 
WHERE email = 'finance@nexastream.co.uk'
ON CONFLICT (user_id) 
DO UPDATE SET 
  tier = 'full',
  updated_at = NOW();

-- Verify the changes
SELECT 
  p.id, 
  p.email, 
  p.user_tier as profile_tier,
  w.tier as wellbeing_tier
FROM profiles p
LEFT JOIN wellbeing w ON p.id = w.user_id
WHERE p.email = 'finance@nexastream.co.uk'; 