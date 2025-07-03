-- 🚨 EMERGENCY TIER FIX - SIMPLEST POSSIBLE
-- Just upgrade the most recent user to full tier

-- Check recent users
SELECT id, email, user_tier, created_at 
FROM profiles 
WHERE created_at > CURRENT_DATE 
ORDER BY created_at DESC;

-- Fix the most recent user (who just paid)
UPDATE profiles 
SET user_tier = 'full' 
WHERE created_at > CURRENT_DATE 
AND user_tier = 'free'
AND id = (
  SELECT id FROM profiles 
  WHERE created_at > CURRENT_DATE 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Verify it worked
SELECT id, email, user_tier, 
  CASE WHEN user_tier = 'full' THEN '✅ FIXED!' ELSE '❌ FAILED' END as status
FROM profiles 
WHERE created_at > CURRENT_DATE 
ORDER BY created_at DESC; 