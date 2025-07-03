-- 🚨 IMMEDIATE USER TIER FIX
-- Run this to fix the user tier after successful Stripe payment

-- User who just upgraded: hello@nexastream.co.uk
-- Expected User ID: 512176d4-9117-41d9-b1c4-8801f9afe959

-- Check current tier first
SELECT 
  id, 
  email, 
  user_tier, 
  updated_at,
  stripe_customer_id,
  stripe_subscription_id
FROM profiles 
WHERE email = 'hello@nexastream.co.uk' 
   OR id = '512176d4-9117-41d9-b1c4-8801f9afe959';

-- Update to full tier
UPDATE profiles 
SET 
  user_tier = 'full',
  updated_at = NOW()
WHERE email = 'hello@nexastream.co.uk' 
   OR id = '512176d4-9117-41d9-b1c4-8801f9afe959';

-- Verify the fix
SELECT 
  id, 
  email, 
  user_tier, 
  updated_at,
  'SUCCESS: User tier updated to full' as status
FROM profiles 
WHERE email = 'hello@nexastream.co.uk' 
   OR id = '512176d4-9117-41d9-b1c4-8801f9afe959'; 