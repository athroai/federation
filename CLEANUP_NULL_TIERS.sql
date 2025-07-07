-- 🧹 CLEANUP NULL TIERS
-- Fix the 6 users with null user_tier values

-- Step 1: Check which users have null tiers
SELECT 
  '=== USERS WITH NULL TIERS ===' as check_type,
  id,
  email,
  user_tier,
  stripe_customer_id,
  subscription_status,
  created_at
FROM profiles 
WHERE user_tier IS NULL
ORDER BY created_at DESC;

-- Step 2: Fix null tiers based on payment status
UPDATE profiles 
SET 
  user_tier = CASE 
    WHEN stripe_customer_id IS NOT NULL AND stripe_customer_id != '' THEN 'lite'
    ELSE 'free'
  END,
  updated_at = NOW()
WHERE user_tier IS NULL;

-- Step 3: Verify the cleanup worked
SELECT 
  '=== VERIFICATION AFTER NULL CLEANUP ===' as check_type,
  user_tier,
  COUNT(*) as user_count,
  CASE user_tier
    WHEN 'free' THEN 'Free tier (0 payments)'
          WHEN 'lite' THEN 'AthroAi Lite (£7.99/month)'
      WHEN 'full' THEN 'AthroAi Full (£14.99/month)'
    ELSE 'Unknown tier'
  END as description
FROM profiles 
GROUP BY user_tier
ORDER BY 
  CASE user_tier
    WHEN 'free' THEN 1
    WHEN 'lite' THEN 2
    WHEN 'full' THEN 3
    ELSE 4
  END; 