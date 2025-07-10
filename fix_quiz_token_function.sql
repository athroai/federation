-- 🚨 FIX: Create missing record_token_usage function for quiz generation
-- This fixes the "Failed to verify token availability" error

-- Create the record_token_usage function that the code expects
CREATE OR REPLACE FUNCTION record_token_usage(
    p_user_id UUID,
    p_tokens_used INTEGER,
    p_cost_gbp DECIMAL(10,6),
    p_model TEXT DEFAULT 'gpt-4o-mini'
)
RETURNS JSONB AS $$
DECLARE
    current_profile RECORD;
    monthly_token_limit INTEGER;
    new_tokens_used INTEGER;
    new_spend_gbp DECIMAL(10,6);
    tokens_exceeded BOOLEAN;
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
    
    -- Get monthly token limit based on tier (using FIXED token limits)
    CASE current_profile.user_tier
        WHEN 'free' THEN monthly_token_limit := 100000;     -- 100K tokens/month
        WHEN 'lite' THEN monthly_token_limit := 1000000;    -- 1M tokens/month
        WHEN 'full' THEN monthly_token_limit := 1602000;    -- 1.602M tokens/month
        ELSE monthly_token_limit := 100000;                 -- Default to free
    END CASE;
    
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
            'remaining', GREATEST(0, monthly_token_limit - current_profile.monthly_tokens_used),
            'tier', current_profile.user_tier
        );
    END IF;
    
    -- Update usage
    UPDATE profiles 
    SET 
        monthly_tokens_used = new_tokens_used,
        monthly_spend_gbp = new_spend_gbp
    WHERE id = p_user_id;
    
    -- Update user_usage table as well if it exists
    BEGIN
        INSERT INTO user_usage (user_id, total_tokens, total_spend_gbp, last_monthly_reset, monthly_token_limit)
        VALUES (p_user_id, new_tokens_used, new_spend_gbp, DATE_TRUNC('month', CURRENT_DATE), monthly_token_limit)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            total_tokens = new_tokens_used,
            total_spend_gbp = new_spend_gbp,
            last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE),
            monthly_token_limit = monthly_token_limit,
            updated_at = NOW();
    EXCEPTION
        WHEN OTHERS THEN
            -- user_usage table might not exist in all environments
            NULL;
    END;
    
    -- Log usage if table exists
    BEGIN
        INSERT INTO ai_usage_logs (user_id, tokens_used, cost_gbp, model, created_at)
        VALUES (p_user_id, p_tokens_used, p_cost_gbp, p_model, NOW());
    EXCEPTION
        WHEN OTHERS THEN
            -- ai_usage_logs table might not exist in all environments
            NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'tokens_used', new_tokens_used,
        'spend_gbp', new_spend_gbp,
        'tokens_remaining', GREATEST(0, monthly_token_limit - new_tokens_used),
        'limit', monthly_token_limit,
        'tier', current_profile.user_tier,
        'is_low_warning', (monthly_token_limit - new_tokens_used) <= (monthly_token_limit * 0.05) AND (monthly_token_limit - new_tokens_used) > 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION record_token_usage(UUID, INTEGER, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_token_usage(UUID, INTEGER, DECIMAL, TEXT) TO service_role;

-- Add comment explaining the function
COMMENT ON FUNCTION record_token_usage IS 'Token usage enforcement function with FIXED July 2025 token limits. Returns success/failure and remaining tokens.'; 