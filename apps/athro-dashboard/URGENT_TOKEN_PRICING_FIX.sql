-- 🚨 URGENT TOKEN PRICING FIX (July 2025)
-- ⚠️ CRITICAL: Users are getting 333x fewer tokens than they should!
-- Run this IMMEDIATELY in your Supabase SQL Editor

-- ===================================================================
-- STEP 1: Fix the severely wrong token limits function
-- ===================================================================

CREATE OR REPLACE FUNCTION get_tier_token_limits(tier_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE tier_name
    WHEN 'free' THEN RETURN 100000;      -- ✅ 100,000 tokens/month (was 300!)
    WHEN 'lite' THEN RETURN 1000000;     -- ✅ 1,000,000 tokens/month (was 4,500!)
    WHEN 'full' THEN RETURN 1602000;     -- ✅ 1,602,000 tokens/month (was 10,500!)
    ELSE RETURN 100000;                  -- Default to free tier
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- STEP 2: Update the token purchase function with correct top-up amount
-- ===================================================================

CREATE OR REPLACE FUNCTION purchase_extra_tokens(
    p_user_id UUID,
    p_extra_tokens INTEGER DEFAULT 320000  -- ✅ 320,000 tokens per £2.00 pack
)
RETURNS JSONB AS $$
DECLARE
    current_profile RECORD;
BEGIN
    -- Get current user profile
    SELECT * INTO current_profile 
    FROM profiles 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Only full tier users can purchase extra tokens
    IF current_profile.user_tier != 'full' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Extra tokens only available for AthroAi Full tier');
    END IF;
    
    -- Add extra tokens (320,000 per £2.00 pack)
    UPDATE profiles 
    SET extra_tokens_purchased = COALESCE(extra_tokens_purchased, 0) + p_extra_tokens
    WHERE id = p_user_id;
    
    -- Log the purchase with correct pricing info
    INSERT INTO subscription_events (user_id, event_type, tokens_added, metadata)
    VALUES (p_user_id, 'token_purchase', p_extra_tokens, jsonb_build_object(
        'purchase_date', NOW(),
        'tokens_purchased', p_extra_tokens,
        'pack_price_gbp', 2.00,
        'tokens_per_pack', 320000,
        'pricing_structure', 'July 2025'
    ));
    
    RETURN jsonb_build_object(
        'success', true,
        'extra_tokens_added', p_extra_tokens,
        'total_extra_tokens', COALESCE(current_profile.extra_tokens_purchased, 0) + p_extra_tokens,
        'pack_cost', '£2.00',
        'tokens_per_pack', 320000
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- STEP 3: Update ALL existing users to correct token limits
-- ===================================================================

-- Update user_usage table with correct monthly limits
UPDATE user_usage 
SET monthly_token_limit = get_tier_token_limits(
    (SELECT user_tier FROM profiles WHERE profiles.id = user_usage.user_id)
)
WHERE monthly_token_limit IS NOT NULL;

-- ===================================================================
-- STEP 4: Update the view with correct API cost limits
-- ===================================================================

CREATE OR REPLACE VIEW user_token_balance AS
SELECT 
    p.id as user_id,
    p.email,
    p.user_tier,
    get_tier_token_limits(p.user_tier) + COALESCE(p.extra_tokens_purchased, 0) as total_monthly_tokens,
    COALESCE(p.monthly_tokens_used, 0) as tokens_used,
    get_tier_token_limits(p.user_tier) + COALESCE(p.extra_tokens_purchased, 0) - COALESCE(p.monthly_tokens_used, 0) as tokens_remaining,
    COALESCE(p.monthly_spend_gbp, 0) as monthly_spend,
    CASE p.user_tier
        WHEN 'free' THEN 0.10        -- ✅ £0.10 API cost (July 2025)
        WHEN 'lite' THEN 1.00         -- ✅ £1.00 API cost (July 2025)
        WHEN 'full' THEN 5.00         -- ✅ £5.00 API cost (July 2025)
        ELSE 0.10
    END as monthly_api_cost_limit,
    -- Low token warning at 5% remaining (more reasonable than 300 tokens)
    (get_tier_token_limits(p.user_tier) + COALESCE(p.extra_tokens_purchased, 0) - COALESCE(p.monthly_tokens_used, 0)) <= 
    (get_tier_token_limits(p.user_tier) * 0.05)
    AND (get_tier_token_limits(p.user_tier) + COALESCE(p.extra_tokens_purchased, 0) - COALESCE(p.monthly_tokens_used, 0)) > 0 
    as is_low_token_warning,
    p.last_monthly_reset
FROM profiles p;

COMMENT ON VIEW user_token_balance IS 'User token balance with CORRECT July 2025 pricing structure';

-- ===================================================================
-- STEP 5: Create audit log of this critical fix
-- ===================================================================

-- Log this critical pricing fix
INSERT INTO subscription_events (user_id, event_type, metadata)
SELECT 
    id,
    'pricing_fix_applied',
    jsonb_build_object(
        'fix_date', NOW(),
        'old_limits', jsonb_build_object(
            'free', 300,
            'lite', 4500,
            'full', 10500
        ),
        'new_limits', jsonb_build_object(
            'free', 100000,
            'lite', 1000000,
            'full', 1602000
        ),
        'severity', 'CRITICAL',
        'reason', 'Users were receiving 333x fewer tokens than paid pricing'
    )
FROM profiles
WHERE user_tier IN ('free', 'lite', 'full');

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Check the fix worked
SELECT 
    'VERIFICATION: Token limits after fix' as check_type,
    tier_name,
    get_tier_token_limits(tier_name) as token_limit
FROM (
    VALUES ('free'), ('lite'), ('full')
) as tiers(tier_name);

-- Count affected users by tier
SELECT 
    user_tier,
    COUNT(*) as users_affected,
    get_tier_token_limits(user_tier) as correct_token_limit
FROM profiles 
WHERE user_tier IS NOT NULL
GROUP BY user_tier;

SELECT '🚨 CRITICAL TOKEN PRICING FIX APPLIED! ✅' as status,
       'Users now receive CORRECT token amounts for their subscription tier' as result; 