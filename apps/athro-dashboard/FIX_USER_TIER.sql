-- 🔧 FIX USER TIER SCRIPT
-- Run this in your Supabase SQL Editor to fix incorrect tier data

-- Step 1: Check current user data (replace with your actual email)
SELECT 
  id,
  email,
  user_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  updated_at
FROM profiles 
WHERE email = 'your-email@example.com'  -- REPLACE WITH YOUR ACTUAL EMAIL
LIMIT 1;

-- Step 2: If you are a paying subscriber but showing as 'free', update to 'full'
-- UNCOMMENT AND RUN THIS ONLY IF YOU CONFIRM YOU'RE A PAID SUBSCRIBER:

/*
UPDATE profiles 
SET 
  user_tier = 'full',
  subscription_status = 'active',
  updated_at = NOW()
WHERE email = 'your-email@example.com'  -- REPLACE WITH YOUR ACTUAL EMAIL
  AND user_tier = 'free';  -- Only update if currently free
*/

-- Step 3: Verify the fix worked
SELECT 
  id,
  email,
  user_tier,
  subscription_status,
  stripe_customer_id,
  updated_at
FROM profiles 
WHERE email = 'your-email@example.com'  -- REPLACE WITH YOUR ACTUAL EMAIL
LIMIT 1;

-- Step 4: Log the tier change for audit purposes
/*
INSERT INTO tier_change_logs (
  user_id,
  old_tier,
  new_tier,
  source,
  metadata,
  timestamp
)
SELECT 
  id,
  'free',
  'full',
  'manual_fix',
  '{"reason": "Fixed incorrect tier display"}',
  NOW()
FROM profiles
WHERE email = 'your-email@example.com'  -- REPLACE WITH YOUR ACTUAL EMAIL
LIMIT 1;
*/ 