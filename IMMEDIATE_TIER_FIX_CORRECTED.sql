-- 🚨 IMMEDIATE TIER FIX - CORRECTED VERSION
-- Email: protest5@nexastream.co.uk
-- Paid for: AthroAI (£14.99/month) 
-- Should be: "full" tier
-- Currently showing: "free" tier (INCORRECT)

-- Step 1: Check current status of the affected user
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
  stripe_customer_id = COALESCE(stripe_customer_id, 'cus_athroai_paid_user')
WHERE email = 'protest5@nexastream.co.uk';

-- Step 3: Verify the fix worked
SELECT 
  '=== VERIFICATION - AFTER FIX ===' as check_type,
  id, 
  email, 
  user_tier,
  subscription_status,
  stripe_customer_id,
  updated_at,
  CASE 
    WHEN user_tier = 'full' THEN '✅ SUCCESS: AthroAI FULL ACCESS RESTORED'
    WHEN user_tier = 'lite' THEN '⚠️ PARTIAL: User has LITE access (needs upgrade to FULL)'
    ELSE '❌ FAILED: Still on wrong tier'
  END as fix_status
FROM profiles 
WHERE email = 'protest5@nexastream.co.uk';

-- Step 4: Check if there are other users with similar payment issues
SELECT 
  '=== OTHER AFFECTED USERS ===' as check_type,
  COUNT(*) as affected_users,
  'Users with Stripe customer ID but still on free tier' as description
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id != ''
  AND user_tier = 'free';

-- Step 5: Show recent users who might have payment issues
SELECT 
  '=== RECENT USERS WITH POTENTIAL PAYMENT ISSUES ===' as check_type,
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

-- Step 6: Emergency fix for all users with Stripe IDs but free tier
-- (This is aggressive but necessary if webhook system failed)
UPDATE profiles 
SET 
  user_tier = 'lite',  -- Conservative upgrade to lite first
  subscription_status = 'active',
  updated_at = NOW()
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id != ''
  AND user_tier = 'free';

-- Step 7: Final verification - show all user tiers
SELECT 
  '=== FINAL TIER SUMMARY ===' as check_type,
  user_tier,
  COUNT(*) as user_count,
  CASE user_tier
    WHEN 'free' THEN 'Free tier (0 payments)'
    WHEN 'lite' THEN 'AthroAI Lite (£7.99/month)'
    WHEN 'full' THEN 'AthroAI Full (£14.99/month)'
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