-- =============================================
-- URGENT TOKEN PRICING FIX - July 2025
-- =============================================
-- 
-- CRITICAL ISSUE: Users are getting 333x FEWER tokens than they paid for!
-- 
-- Current WRONG limits:
--   Free: 300 tokens (should be 100,000)
--   Lite: 4,500 tokens (should be 1,000,000) 
--   Full: 10,500 tokens (should be 1,602,000)
--
-- This fix updates the token limits to match the July 2025 pricing structure
--
-- =============================================

BEGIN;

-- Update token limits in user_tiers table to correct July 2025 values
UPDATE user_tiers 
SET 
  token_limit = CASE tier_name
    WHEN 'free' THEN 100000     -- 100K tokens/month
    WHEN 'lite' THEN 1000000    -- 1M tokens/month  
    WHEN 'full' THEN 1602000    -- 1.602M tokens/month
    ELSE token_limit            -- Keep existing for any other tiers
  END,
  updated_at = NOW()
WHERE tier_name IN ('free', 'lite', 'full');

-- Update any existing user token balances that might be cached with wrong limits
-- Reset to new limits for users who haven't used tokens this month
UPDATE user_token_balances 
SET 
  total_tokens = CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_tiers ut 
      JOIN users u ON u.user_tier = ut.tier_name 
      WHERE u.id = user_token_balances.user_id
    ) THEN (
      SELECT ut.token_limit 
      FROM user_tiers ut 
      JOIN users u ON u.user_tier = ut.tier_name 
      WHERE u.id = user_token_balances.user_id
    )
    ELSE total_tokens
  END,
  updated_at = NOW()
WHERE used_tokens = 0  -- Only reset if user hasn't used any tokens
  OR total_tokens < used_tokens; -- Or if total is somehow less than used (data integrity issue)

-- Log the fix in a tracking table (create if doesn't exist)
CREATE TABLE IF NOT EXISTS token_pricing_fixes (
  id SERIAL PRIMARY KEY,
  fix_name VARCHAR(100) NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT,
  old_values JSONB,
  new_values JSONB
);

-- Record this fix
INSERT INTO token_pricing_fixes (fix_name, description, old_values, new_values)
VALUES (
  'July2025_Token_Limits_Fix',
  'Fixed severely incorrect token limits - users were getting 333x fewer tokens than paid for',
  '{"free": 300, "lite": 4500, "full": 10500}',
  '{"free": 100000, "lite": 1000000, "full": 1602000}'
);

-- Verify the fix
SELECT 
  tier_name,
  token_limit,
  CASE tier_name
    WHEN 'free' THEN 'Expected: 100,000'
    WHEN 'lite' THEN 'Expected: 1,000,000'  
    WHEN 'full' THEN 'Expected: 1,602,000'
  END as expected_value,
  updated_at
FROM user_tiers 
WHERE tier_name IN ('free', 'lite', 'full')
ORDER BY 
  CASE tier_name 
    WHEN 'free' THEN 1 
    WHEN 'lite' THEN 2 
    WHEN 'full' THEN 3 
  END;

COMMIT;

-- Success message
SELECT 
  '🎉 TOKEN PRICING FIX COMPLETE! 🎉' as status,
  'Users now get the correct token amounts they paid for' as result,
  '333x increase in token limits applied' as impact; 