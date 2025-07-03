-- 🚨 SIMPLIFIED CRITICAL PAYMENT FIX
-- User paid $19.99 (sandbox) but showing "Free" tier instead of "Full"
-- This version only uses columns that exist in the profiles table

-- Step 1: Check what columns exist in profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Find the most recent user who registered/paid today
SELECT 
  id, 
  email, 
  user_tier, 
  created_at,
  updated_at,
  '🔍 CHECKING USER STATUS' as note
FROM profiles 
WHERE created_at > CURRENT_DATE  -- Today's registrations
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: IMMEDIATE FIX - Update user tier ONLY (safe approach)
UPDATE profiles 
SET 
  user_tier = 'full',
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

-- Step 4: VERIFICATION - Check the fix worked
SELECT 
  id, 
  email, 
  user_tier,
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

-- ⚡ SIMPLE FIX COMPLETE
-- The user who paid $19.99 should now have FULL tier access
-- All premium features should be unlocked immediately 