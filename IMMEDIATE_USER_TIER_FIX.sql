-- 🚨 IMMEDIATE TIER FIX FOR PAID ATHROAI USER
-- Email: protest5@nexastream.co.uk
-- Paid for: AthroAi (£14.99/month) 
-- Should be: "full" tier
-- Currently showing: "free" tier (INCORRECT)

-- Step 1: Check current status
SELECT 
  '=== CURRENT USER STATUS ===' as check_type,
  id, 
  email, 
  user_tier, 
  stripe_customer_id,
  subscription_status,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'protest5@nexastream.co.uk';

-- Step 2: IMMEDIATE FIX - Update to correct "full" tier
UPDATE profiles 
SET 
  user_tier = 'full',
  subscription_status = 'active',
  subscription_start_date = COALESCE(subscription_start_date, NOW()),
  updated_at = NOW(),
  stripe_customer_id = COALESCE(stripe_customer_id, 'cus_paid_athroai_user')
WHERE email = 'protest5@nexastream.co.uk';

-- Step 3: Log this emergency tier correction
INSERT INTO tier_change_logs (user_id, old_tier, new_tier, source, metadata, timestamp)
SELECT 
  id,
  'free',
  'full',
  'emergency_fix',
  '{"reason": "User paid for AthroAi £14.99/month but was stuck on free tier", "email": "protest5@nexastream.co.uk", "fix_applied": "immediate_manual_correction"}',
  NOW()
FROM profiles 
WHERE email = 'protest5@nexastream.co.uk';

-- Step 4: Update wellbeing_data table to match (if it exists)
INSERT INTO wellbeing_data (user_id, tier, updated_at) 
SELECT id, 'full', NOW()
FROM profiles 
WHERE email = 'protest5@nexastream.co.uk'
ON CONFLICT (user_id) 
DO UPDATE SET 
  tier = 'full',
  updated_at = NOW();

-- Step 5: Verify the fix worked
SELECT 
  '=== AFTER FIX - VERIFICATION ===' as check_type,
  p.id, 
  p.email, 
  p.user_tier,
  p.subscription_status,
  p.stripe_customer_id,
  p.updated_at,
  w.tier as wellbeing_tier,
  CASE 
    WHEN p.user_tier = 'full' THEN '✅ SUCCESS: AthroAi FULL ACCESS RESTORED'
    ELSE '❌ FIX FAILED - NEEDS INVESTIGATION'
  END as fix_status
FROM profiles p
LEFT JOIN wellbeing_data w ON p.id = w.user_id
WHERE p.email = 'protest5@nexastream.co.uk';

-- Step 6: Check if there are other users with similar issues
SELECT 
  '=== OTHER USERS WHO MIGHT HAVE SAME ISSUE ===' as check_type,
  COUNT(*) as affected_users,
  'Users with Stripe customer ID but still on free tier' as description
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
  AND user_tier = 'free';

-- Show any recent users who might have payment issues
SELECT 
  '=== RECENT USERS WHO MIGHT NEED FIXING ===' as check_type,
  id,
  email,
  user_tier,
  stripe_customer_id,
  subscription_status,
  created_at
FROM profiles 
WHERE (stripe_customer_id IS NOT NULL AND user_tier = 'free')
   OR (created_at > NOW() - INTERVAL '24 hours' AND user_tier = 'free')
ORDER BY created_at DESC
LIMIT 10; 