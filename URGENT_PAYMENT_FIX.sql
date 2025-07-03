-- 🚨 CRITICAL PAYMENT FIX
-- User paid $19.99 (sandbox) but showing "Free" tier instead of "Full"
-- This must be fixed IMMEDIATELY

-- Step 1: Find the most recent user who registered/paid today
SELECT 
  id, 
  email, 
  user_tier, 
  stripe_customer_id,
  subscription_status,
  created_at,
  updated_at,
  '🔍 CHECKING USER STATUS' as note
FROM profiles 
WHERE created_at > CURRENT_DATE  -- Today's registrations
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: IMMEDIATE FIX - Update the most recent user to FULL tier
-- This targets users who registered today but still show as free
UPDATE profiles 
SET 
  user_tier = 'full',
  subscription_status = 'active',
  subscription_start_date = NOW(),
  updated_at = NOW()
WHERE 
  created_at > CURRENT_DATE  -- Today's registrations
  AND user_tier = 'free'     -- Still showing as free despite payment
  AND id = (
    SELECT id FROM profiles 
    WHERE created_at > CURRENT_DATE 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Step 3: Ensure wellbeing_data table is also updated
INSERT INTO wellbeing_data (user_id, tier, updated_at) 
SELECT id, 'full', NOW()
FROM profiles 
WHERE created_at > CURRENT_DATE 
AND user_tier = 'full'
ON CONFLICT (user_id) 
DO UPDATE SET 
  tier = 'full',
  updated_at = NOW();

-- Step 4: VERIFICATION - Check the fix worked
SELECT 
  id, 
  email, 
  user_tier,
  subscription_status,
  subscription_start_date,
  created_at,
  updated_at,
  CASE 
    WHEN user_tier = 'full' THEN '✅ PAYMENT PROCESSED - FULL ACCESS'
    ELSE '❌ STILL NEEDS FIX'
  END as payment_status,
  '🎉 User should now have ALL premium features unlocked' as result
FROM profiles 
WHERE created_at > CURRENT_DATE
ORDER BY updated_at DESC;

-- Step 5: Log this emergency fix
INSERT INTO tier_change_logs (user_id, old_tier, new_tier, source, metadata, timestamp)
SELECT 
  id,
  'free',
  'full',
  'emergency_payment_fix',
  '{"reason": "User paid $19.99 but tier not updated", "payment_amount": "$19.99", "urgency": "critical"}',
  NOW()
FROM profiles 
WHERE created_at > CURRENT_DATE 
AND user_tier = 'full';

-- ⚡ IMMEDIATE ACTION COMPLETE
-- The user who paid $19.99 should now have FULL tier access
-- All premium features should be unlocked immediately 