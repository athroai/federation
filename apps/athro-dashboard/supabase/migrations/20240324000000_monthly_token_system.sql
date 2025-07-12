-- Migration: Monthly Token-Based SaaS System
-- Updates the database schema to support the new monthly token limits and enhanced user profiles

-- 1. Add new profile fields for enhanced user data
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS exam_board TEXT,
ADD COLUMN IF NOT EXISTS recent_grades TEXT,
ADD COLUMN IF NOT EXISTS monthly_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_spend_gbp DECIMAL(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_monthly_reset DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
ADD COLUMN IF NOT EXISTS extra_tokens_purchased INTEGER DEFAULT 0;

-- 2. Update user_usage table to track monthly instead of daily usage
ALTER TABLE user_usage
DROP COLUMN IF EXISTS last_reset_date,
ADD COLUMN IF NOT EXISTS last_monthly_reset DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
ADD COLUMN IF NOT EXISTS monthly_token_limit INTEGER DEFAULT 300;

-- 3. Create function to get tier token limits
CREATE OR REPLACE FUNCTION get_tier_token_limits(tier_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE tier_name
    WHEN 'free' THEN RETURN 300;      -- 300 tokens/month
    WHEN 'lite' THEN RETURN 4500;     -- 4,500 tokens/month  
    WHEN 'full' THEN RETURN 10500;    -- 10,500 tokens/month
    ELSE RETURN 300;                  -- Default to free
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset monthly counters for users whose last reset was before this month
  UPDATE profiles 
  SET 
    monthly_tokens_used = 0,
    monthly_spend_gbp = 0,
    last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE)
  WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE);
  
  -- Reset user_usage table for new month
  UPDATE user_usage
  SET 
    total_tokens = 0,
    total_spend_gbp = 0,
    last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE),
    monthly_token_limit = get_tier_token_limits(
      (SELECT user_tier FROM profiles WHERE profiles.id = user_usage.user_id)
    )
  WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE);
  
  -- Log the reset operation
  INSERT INTO subscription_events (user_id, event_type, metadata)
  SELECT id, 'monthly_reset', jsonb_build_object(
    'reset_date', DATE_TRUNC('month', CURRENT_DATE),
    'previous_reset', last_monthly_reset
  )
  FROM profiles 
  WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE);
END;
$$;

-- 5. Create function to check and update monthly token usage
CREATE OR REPLACE FUNCTION update_monthly_token_usage(
    p_user_id UUID,
    p_tokens_used INTEGER DEFAULT 0,
    p_cost_gbp DECIMAL(10,6) DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    current_profile RECORD;
    monthly_token_limit INTEGER;
    new_tokens_used INTEGER;
    new_spend_gbp DECIMAL(10,6);
    tokens_exceeded BOOLEAN;
    result JSONB;
BEGIN
    -- Get current user profile
    SELECT * INTO current_profile 
    FROM profiles 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Reset if new month
    IF current_profile.last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE) THEN
        UPDATE profiles 
        SET 
            monthly_tokens_used = 0,
            monthly_spend_gbp = 0,
            last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE)
        WHERE id = p_user_id;
        
        -- Re-fetch the updated profile data
        SELECT * INTO current_profile 
        FROM profiles 
        WHERE id = p_user_id;
    END IF;
    
    -- Get monthly token limit based on tier
    monthly_token_limit := get_tier_token_limits(current_profile.user_tier);
    
    -- Add extra tokens if purchased (for full tier users)
    IF current_profile.user_tier = 'full' THEN
        monthly_token_limit := monthly_token_limit + COALESCE(current_profile.extra_tokens_purchased, 0);
    END IF;
    
    -- Calculate new usage
    new_tokens_used := current_profile.monthly_tokens_used + p_tokens_used;
    new_spend_gbp := current_profile.monthly_spend_gbp + p_cost_gbp;
    tokens_exceeded := new_tokens_used > monthly_token_limit;
    
    -- Check if usage would exceed limit
    IF tokens_exceeded THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Monthly token limit exceeded',
            'limit_type', 'tokens',
            'current_usage', current_profile.monthly_tokens_used,
            'limit', monthly_token_limit,
            'remaining', GREATEST(0, monthly_token_limit - current_profile.monthly_tokens_used)
        );
    END IF;
    
    -- Update usage
    UPDATE profiles 
    SET 
        monthly_tokens_used = new_tokens_used,
        monthly_spend_gbp = new_spend_gbp
    WHERE id = p_user_id;
    
    -- Update user_usage table as well
    INSERT INTO user_usage (user_id, total_tokens, total_spend_gbp, last_monthly_reset, monthly_token_limit)
    VALUES (p_user_id, new_tokens_used, new_spend_gbp, DATE_TRUNC('month', CURRENT_DATE), monthly_token_limit)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_tokens = new_tokens_used,
        total_spend_gbp = new_spend_gbp,
        last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE),
        monthly_token_limit = monthly_token_limit,
        updated_at = NOW();
    
    -- Log usage
    INSERT INTO ai_usage_logs (user_id, tokens_used, cost_gbp, created_at)
    VALUES (p_user_id, p_tokens_used, p_cost_gbp, NOW());
    
    RETURN jsonb_build_object(
        'success', true,
        'tokens_used', new_tokens_used,
        'spend_gbp', new_spend_gbp,
        'tokens_remaining', GREATEST(0, monthly_token_limit - new_tokens_used),
        'limit', monthly_token_limit,
        'tier', current_profile.user_tier,
        'is_low_warning', (monthly_token_limit - new_tokens_used) <= 300 AND (monthly_token_limit - new_tokens_used) > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to purchase extra tokens (for full tier users)
CREATE OR REPLACE FUNCTION purchase_extra_tokens(
    p_user_id UUID,
    p_extra_tokens INTEGER
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
        RETURN jsonb_build_object('success', false, 'error', 'Extra tokens only available for AthroAi tier');
    END IF;
    
    -- Add extra tokens
    UPDATE profiles 
    SET extra_tokens_purchased = COALESCE(extra_tokens_purchased, 0) + p_extra_tokens
    WHERE id = p_user_id;
    
    -- Log the purchase
    INSERT INTO subscription_events (user_id, event_type, tokens_added, metadata)
    VALUES (p_user_id, 'token_purchase', p_extra_tokens, jsonb_build_object(
        'purchase_date', NOW(),
        'tokens_purchased', p_extra_tokens
    ));
    
    RETURN jsonb_build_object(
        'success', true,
        'extra_tokens_added', p_extra_tokens,
        'total_extra_tokens', COALESCE(current_profile.extra_tokens_purchased, 0) + p_extra_tokens
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_monthly_reset ON profiles(last_monthly_reset);
CREATE INDEX IF NOT EXISTS idx_profiles_tier_tokens ON profiles(user_tier, monthly_tokens_used);
CREATE INDEX IF NOT EXISTS idx_user_usage_monthly_reset ON user_usage(last_monthly_reset);

-- 8. Update existing users to have proper monthly limits
UPDATE user_usage 
SET monthly_token_limit = get_tier_token_limits(
    (SELECT user_tier FROM profiles WHERE profiles.id = user_usage.user_id)
)
WHERE monthly_token_limit IS NULL OR monthly_token_limit = 0;

-- 9. Ensure all users have proper reset dates
UPDATE profiles 
SET last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE)
WHERE last_monthly_reset IS NULL;

UPDATE user_usage 
SET last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE)
WHERE last_monthly_reset IS NULL;

-- 10. Create view for easy token balance queries
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
        WHEN 'free' THEN 0.20
        WHEN 'lite' THEN 3.00
        WHEN 'full' THEN 7.00
        ELSE 0.20
    END as monthly_spend_limit,
    (get_tier_token_limits(p.user_tier) + COALESCE(p.extra_tokens_purchased, 0) - COALESCE(p.monthly_tokens_used, 0)) <= 300 
    AND (get_tier_token_limits(p.user_tier) + COALESCE(p.extra_tokens_purchased, 0) - COALESCE(p.monthly_tokens_used, 0)) > 0 
    as is_low_token_warning,
    p.last_monthly_reset
FROM profiles p;

COMMENT ON VIEW user_token_balance IS 'Provides easy access to user token balance and usage information'; 