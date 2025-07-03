-- ✅ ATHRO AI SUBSCRIPTION SYSTEM - COMPREHENSIVE DATABASE SCHEMA
-- Implements Free/Lite/Full tier system with token tracking and time-based access control

-- 1. Update profiles table with new subscription fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'lite', 'full')),
ADD COLUMN IF NOT EXISTS tokens_used_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_token_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_used_today_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- 2. Create daily usage tracking table
CREATE TABLE IF NOT EXISTS daily_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tokens_used INTEGER DEFAULT 0,
    time_used_minutes INTEGER DEFAULT 0,
    ai_calls_made INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- 3. Create AI usage logs table for detailed tracking
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    model_used TEXT NOT NULL CHECK (model_used IN ('gpt-3.5-turbo', 'gpt-4-turbo')),
    task_type TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    cost_usd DECIMAL(10,6),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create subscription events table for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('upgrade', 'downgrade', 'cancel', 'token_purchase', 'limit_reached')),
    old_tier TEXT,
    new_tier TEXT,
    tokens_added INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_usage_logs_user_date ON daily_usage_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_user_tier ON profiles(user_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_last_reset ON profiles(last_activity_reset_date);

-- 6. Create function to reset daily usage
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
    -- Reset daily counters for users whose last reset was before today
    UPDATE profiles 
    SET 
        tokens_used_today = 0,
        time_used_today_minutes = 0,
        last_activity_reset_date = CURRENT_DATE
    WHERE last_activity_reset_date < CURRENT_DATE;
    
    -- Log the reset operation
    INSERT INTO subscription_events (user_id, event_type, metadata)
    SELECT id, 'daily_reset', jsonb_build_object('reset_date', CURRENT_DATE)
    FROM profiles 
    WHERE last_activity_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check and update usage
CREATE OR REPLACE FUNCTION update_user_usage(
    p_user_id UUID,
    p_tokens_used INTEGER DEFAULT 0,
    p_time_used_minutes INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    current_profile RECORD;
    daily_token_limit INTEGER;
    daily_time_limit INTEGER;
    result JSONB;
BEGIN
    -- Get current user profile
    SELECT * INTO current_profile 
    FROM profiles 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Reset if new day
    IF current_profile.last_activity_reset_date < CURRENT_DATE THEN
        UPDATE profiles 
        SET 
            tokens_used_today = 0,
            time_used_today_minutes = 0,
            last_activity_reset_date = CURRENT_DATE
        WHERE id = p_user_id;
        
        current_profile.tokens_used_today := 0;
        current_profile.time_used_today_minutes := 0;
    END IF;
    
    -- Set limits based on tier
    CASE current_profile.user_tier
        WHEN 'free' THEN
            daily_token_limit := 1250;  -- ~15 minutes
            daily_time_limit := 15;     -- 15 minutes total time
        WHEN 'lite' THEN
            daily_token_limit := 15000; -- ~2 hours
            daily_time_limit := 120;    -- 2 hours (but not used for lite)
        WHEN 'full' THEN
            daily_token_limit := 15000 + current_profile.extra_token_balance;
            daily_time_limit := 120;    -- 2 hours (but not used for full)
        ELSE
            daily_token_limit := 1250;
            daily_time_limit := 15;
    END CASE;
    
    -- Calculate new usage
    DECLARE
        new_tokens_used INTEGER := current_profile.tokens_used_today + p_tokens_used;
        new_time_used INTEGER := current_profile.time_used_today_minutes + p_time_used_minutes;
        tokens_exceeded BOOLEAN := new_tokens_used > daily_token_limit;
        time_exceeded BOOLEAN := new_time_used > daily_time_limit;
    BEGIN
        -- For free tier, check time limit primarily
        IF current_profile.user_tier = 'free' AND time_exceeded THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Daily time limit exceeded',
                'limit_type', 'time',
                'current_usage', current_profile.time_used_today_minutes,
                'limit', daily_time_limit
            );
        END IF;
        
        -- For lite/full tiers, check token limit
        IF current_profile.user_tier != 'free' AND tokens_exceeded THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Daily token limit exceeded',
                'limit_type', 'tokens',
                'current_usage', current_profile.tokens_used_today,
                'limit', daily_token_limit
            );
        END IF;
        
        -- Update usage
        UPDATE profiles 
        SET 
            tokens_used_today = new_tokens_used,
            time_used_today_minutes = new_time_used
        WHERE id = p_user_id;
        
        -- Log to daily usage
        INSERT INTO daily_usage_logs (user_id, tokens_used, time_used_minutes)
        VALUES (p_user_id, p_tokens_used, p_time_used_minutes)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET 
            tokens_used = daily_usage_logs.tokens_used + p_tokens_used,
            time_used_minutes = daily_usage_logs.time_used_minutes + p_time_used_minutes,
            updated_at = NOW();
        
        RETURN jsonb_build_object(
            'success', true,
            'tokens_used', new_tokens_used,
            'time_used', new_time_used,
            'tokens_remaining', GREATEST(0, daily_token_limit - new_tokens_used),
            'time_remaining', GREATEST(0, daily_time_limit - new_time_used),
            'tier', current_profile.user_tier
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to add extra tokens
CREATE OR REPLACE FUNCTION add_extra_tokens(
    p_user_id UUID,
    p_token_amount INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles 
    SET extra_token_balance = extra_token_balance + p_token_amount
    WHERE id = p_user_id AND user_tier = 'full';
    
    IF FOUND THEN
        INSERT INTO subscription_events (user_id, event_type, tokens_added, metadata)
        VALUES (p_user_id, 'token_purchase', p_token_amount, 
                jsonb_build_object('purchase_date', NOW()));
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update RLS policies for new tables
ALTER TABLE daily_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Daily usage logs policies
CREATE POLICY "Users can view own usage logs" ON daily_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage usage logs" ON daily_usage_logs
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.uid() = user_id
    );

-- AI usage logs policies  
CREATE POLICY "Users can view own AI usage" ON ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage AI usage" ON ai_usage_logs
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.uid() = user_id
    );

-- Subscription events policies
CREATE POLICY "Users can view own subscription events" ON subscription_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage subscription events" ON subscription_events
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR 
        auth.uid() = user_id
    );

-- 10. Create daily reset job (run this as a cron job)
-- This would typically be run by a cron job or scheduled function
-- SELECT cron.schedule('reset-daily-usage', '0 0 * * *', 'SELECT reset_daily_usage();');

-- 11. Set up triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_usage_logs_updated_at 
    BEFORE UPDATE ON daily_usage_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;

-- Insert initial admin user as full tier (optional)
-- UPDATE profiles SET user_tier = 'full' WHERE email = 'admin@athro.app'; 