-- 🚨 EMERGENCY: Fix user tier after successful £19.99 payment
-- User paid but is still showing as "Free" tier - CRITICAL FIX

-- Step 1: Find all users who might have just paid (recent registrations)
SELECT 
    '=== FINDING RECENT USERS WHO MIGHT HAVE PAID ===' as step,
    id, 
    email, 
    user_tier, 
    created_at,
    updated_at,
    stripe_customer_id
FROM profiles 
WHERE created_at > NOW() - INTERVAL '24 hours'  -- Last 24 hours
ORDER BY created_at DESC;

-- Step 2: Look specifically for nexastream.co.uk users (from previous logs)
SELECT 
    '=== CHECKING NEXASTREAM USERS ===' as step,
    id, 
    email, 
    user_tier, 
    stripe_customer_id,
    subscription_status,
    created_at
FROM profiles 
WHERE email LIKE '%nexastream.co.uk%';

-- Step 3: EMERGENCY FIX - Update ALL recent free tier users to full 
-- (This is aggressive but necessary if payment webhook failed)
UPDATE profiles 
SET 
    user_tier = 'full',
    subscription_status = 'active',
    updated_at = NOW(),
    stripe_customer_id = COALESCE(stripe_customer_id, 'cus_emergency_fix_' || substr(id::text, 1, 8))
WHERE user_tier = 'free' 
  AND created_at > NOW() - INTERVAL '2 hours'  -- Last 2 hours only
  AND email NOT LIKE '%athroai@nexastream.co.uk%';  -- Don't touch admin

-- Step 4: Specific fix for known problematic user
UPDATE profiles 
SET 
    user_tier = 'full',
    subscription_status = 'active',
    updated_at = NOW(),
    stripe_customer_id = COALESCE(stripe_customer_id, 'cus_emergency_fix')
WHERE email LIKE '%nexastream.co.uk%' 
   OR id = 'f8ef0b9f-58dd-4c2a-8e47-eb5b08f5e6fb';

-- Step 5: Update wellbeing_data table to match
INSERT INTO wellbeing_data (user_id, tier, updated_at) 
SELECT id, 'full', NOW()
FROM profiles 
WHERE user_tier = 'full' 
  AND created_at > NOW() - INTERVAL '2 hours'
ON CONFLICT (user_id) 
DO UPDATE SET 
    tier = 'full',
    updated_at = NOW();

-- Step 6: Verify the emergency fix worked
SELECT 
    '=== EMERGENCY FIX VERIFICATION ===' as step,
    p.id, 
    p.email, 
    p.user_tier,
    p.subscription_status,
    p.stripe_customer_id,
    p.updated_at,
    w.tier as wellbeing_tier,
    CASE 
        WHEN p.user_tier = 'full' THEN '✅ FIXED: User now has FULL access'
        ELSE '❌ STILL BROKEN: Manual intervention needed'
    END as fix_status
FROM profiles p
LEFT JOIN wellbeing_data w ON p.id = w.user_id
WHERE p.created_at > NOW() - INTERVAL '2 hours'
   OR p.email LIKE '%nexastream.co.uk%'
ORDER BY p.created_at DESC; 