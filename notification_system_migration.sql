-- AthroAI Comprehensive Notification System Database Migration
-- This creates all tables needed for web push, email, in-app, and study reminders

-- Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL, -- Store the push subscription object
    preferences JSONB DEFAULT '{}', -- User notification preferences
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id) -- One subscription per user
);

-- Study Reminders Table
CREATE TABLE IF NOT EXISTS study_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('daily_study', 'subject_review', 'exam_prep', 'break_reminder', 'streak_motivation')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    recurring BOOLEAN DEFAULT false,
    recurring_pattern TEXT CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly')),
    subjects TEXT[], -- Array of subject names
    athro_id TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Logs Table (for analytics and debugging)
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('push', 'email', 'in_app')),
    recipient TEXT NOT NULL, -- email address or push endpoint
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Events Table (for tracking user interactions)
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id TEXT, -- Could be reminder ID, log ID, etc.
    action TEXT NOT NULL CHECK (action IN ('sent', 'delivered', 'clicked', 'dismissed', 'snoozed')),
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced User Preferences Table for Notifications
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    web_push_enabled BOOLEAN DEFAULT false,
    web_push_study_reminders BOOLEAN DEFAULT true,
    web_push_progress_updates BOOLEAN DEFAULT true,
    web_push_exam_alerts BOOLEAN DEFAULT true,
    web_push_low_token_warnings BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    email_daily_digest BOOLEAN DEFAULT false,
    email_weekly_progress BOOLEAN DEFAULT true,
    email_study_reminders BOOLEAN DEFAULT true,
    email_exam_tips BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    in_app_real_time_updates BOOLEAN DEFAULT true,
    in_app_achievement_alerts BOOLEAN DEFAULT true,
    in_app_session_timers BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Study Streaks Table (for tracking and celebrating progress)
CREATE TABLE IF NOT EXISTS study_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_study_date DATE,
    streak_start_date DATE,
    total_study_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Study Goals Table (for personalized reminders)
CREATE TABLE IF NOT EXISTS study_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('daily_minutes', 'weekly_sessions', 'subject_mastery', 'exam_preparation')),
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    subject TEXT,
    deadline DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements Table (for milestone notifications)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}' -- Store specific achievement data
);

-- Email Templates Table (for managing notification templates)
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    variables TEXT[], -- Array of variable names used in template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Queue Table (for scheduled notifications)
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('push', 'email', 'in_app')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);

CREATE INDEX IF NOT EXISTS idx_study_reminders_user_id ON study_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_study_reminders_scheduled_time ON study_reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_study_reminders_active ON study_reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_study_reminders_type ON study_reminders(type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_notification_events_notification_id ON notification_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_action ON notification_events(action);
CREATE INDEX IF NOT EXISTS idx_notification_events_timestamp ON notification_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_study_streaks_user_id ON study_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_streaks_last_study_date ON study_streaks(last_study_date);

CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_active ON study_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_study_goals_deadline ON study_goals(deadline);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at);

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for User Data Tables
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own study reminders" ON study_reminders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification preferences" ON user_notification_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own study streaks" ON study_streaks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own study goals" ON study_goals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification queue" ON notification_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Service role policies for background operations
CREATE POLICY "Service role can manage all notifications" ON notification_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage notification events" ON notification_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage notification queue" ON notification_queue
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can view email templates" ON email_templates
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant necessary permissions
GRANT ALL ON push_subscriptions TO authenticated;
GRANT ALL ON study_reminders TO authenticated;
GRANT SELECT ON notification_logs TO authenticated;
GRANT ALL ON user_notification_preferences TO authenticated;
GRANT ALL ON study_streaks TO authenticated;
GRANT ALL ON study_goals TO authenticated;
GRANT SELECT ON user_achievements TO authenticated;
GRANT SELECT ON notification_queue TO authenticated;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Functions for notification management

-- Function to update study streak
CREATE OR REPLACE FUNCTION update_study_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    last_date DATE;
    current_date DATE := CURRENT_DATE;
    streak_record RECORD;
BEGIN
    -- Get current streak record
    SELECT * INTO streak_record
    FROM study_streaks
    WHERE user_id = p_user_id;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO study_streaks (user_id, current_streak, longest_streak, last_study_date, streak_start_date, total_study_days)
        VALUES (p_user_id, 1, 1, current_date, current_date, 1);
        RETURN;
    END IF;
    
    last_date := streak_record.last_study_date;
    
    -- If already studied today, don't update
    IF last_date = current_date THEN
        RETURN;
    END IF;
    
    -- If studied yesterday, continue streak
    IF last_date = current_date - INTERVAL '1 day' THEN
        UPDATE study_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_study_date = current_date,
            total_study_days = total_study_days + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        -- Streak broken, reset
        UPDATE study_streaks
        SET current_streak = 1,
            last_study_date = current_date,
            streak_start_date = current_date,
            total_study_days = total_study_days + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_type TEXT, achievement_name TEXT, description TEXT) AS $$
DECLARE
    streak_count INTEGER;
    total_sessions INTEGER;
    subjects_count INTEGER;
BEGIN
    -- Get current streak
    SELECT current_streak INTO streak_count
    FROM study_streaks
    WHERE user_id = p_user_id;
    
    -- Check streak achievements
    IF streak_count = 7 AND NOT EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id AND achievement_type = 'streak_7'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'streak_7', '7-Day Streak Master', 'Studied for 7 consecutive days');
        
        RETURN QUERY SELECT 'streak_7'::TEXT, '7-Day Streak Master'::TEXT, 'Studied for 7 consecutive days'::TEXT;
    END IF;
    
    IF streak_count = 30 AND NOT EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id AND achievement_type = 'streak_30'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'streak_30', 'Monthly Dedication', 'Studied for 30 consecutive days');
        
        RETURN QUERY SELECT 'streak_30'::TEXT, 'Monthly Dedication'::TEXT, 'Studied for 30 consecutive days'::TEXT;
    END IF;
    
    -- Check session count achievements
    SELECT COUNT(*) INTO total_sessions
    FROM study_sessions
    WHERE user_id = p_user_id;
    
    IF total_sessions = 50 AND NOT EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id AND achievement_type = 'sessions_50'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'sessions_50', 'Study Champion', 'Completed 50 study sessions');
        
        RETURN QUERY SELECT 'sessions_50'::TEXT, 'Study Champion'::TEXT, 'Completed 50 study sessions'::TEXT;
    END IF;
    
    -- Check subject diversity achievement
    SELECT COUNT(DISTINCT subject) INTO subjects_count
    FROM study_sessions
    WHERE user_id = p_user_id;
    
    IF subjects_count = 5 AND NOT EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id AND achievement_type = 'diverse_learner'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description)
        VALUES (p_user_id, 'diverse_learner', 'Renaissance Scholar', 'Studied 5 different subjects');
        
        RETURN QUERY SELECT 'diverse_learner'::TEXT, 'Renaissance Scholar'::TEXT, 'Studied 5 different subjects'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE(
    web_push_enabled BOOLEAN,
    web_push_study_reminders BOOLEAN,
    web_push_progress_updates BOOLEAN,
    web_push_exam_alerts BOOLEAN,
    web_push_low_token_warnings BOOLEAN,
    email_enabled BOOLEAN,
    email_daily_digest BOOLEAN,
    email_weekly_progress BOOLEAN,
    email_study_reminders BOOLEAN,
    email_exam_tips BOOLEAN,
    in_app_enabled BOOLEAN,
    in_app_real_time_updates BOOLEAN,
    in_app_achievement_alerts BOOLEAN,
    in_app_session_timers BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(unp.web_push_enabled, false),
        COALESCE(unp.web_push_study_reminders, true),
        COALESCE(unp.web_push_progress_updates, true),
        COALESCE(unp.web_push_exam_alerts, true),
        COALESCE(unp.web_push_low_token_warnings, true),
        COALESCE(unp.email_enabled, true),
        COALESCE(unp.email_daily_digest, false),
        COALESCE(unp.email_weekly_progress, true),
        COALESCE(unp.email_study_reminders, true),
        COALESCE(unp.email_exam_tips, true),
        COALESCE(unp.in_app_enabled, true),
        COALESCE(unp.in_app_real_time_updates, true),
        COALESCE(unp.in_app_achievement_alerts, true),
        COALESCE(unp.in_app_session_timers, true)
    FROM user_notification_preferences unp
    WHERE unp.user_id = p_user_id
    
    UNION ALL
    
    -- Default values if no preferences exist
    SELECT 
        false, true, true, true, true,  -- web push defaults
        true, false, true, true, true,   -- email defaults  
        true, true, true, true           -- in-app defaults
    WHERE NOT EXISTS (
        SELECT 1 FROM user_notification_preferences WHERE user_id = p_user_id
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO study_streaks (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS create_notification_preferences_for_new_user ON auth.users;
CREATE TRIGGER create_notification_preferences_for_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Insert default email templates
INSERT INTO email_templates (template_name, subject, html_content, variables) VALUES
('study_reminder', 'Time to Study - AthroAI', '<!-- Template content would go here -->', ARRAY['title', 'message', 'subjects', 'athroId']),
('progress_update', 'Your Weekly Progress - AthroAI', '<!-- Template content would go here -->', ARRAY['weekStart', 'weekEnd', 'studyTime', 'sessionsCompleted', 'subjectsStudied', 'topSubject', 'streak', 'achievements']),
('exam_alert', 'Exam Alert - AthroAI', '<!-- Template content would go here -->', ARRAY['subject', 'examDate', 'daysUntil', 'timeRemaining']),
('achievement_unlocked', 'Achievement Unlocked - AthroAI', '<!-- Template content would go here -->', ARRAY['achievement', 'description', 'earnedAt'])
ON CONFLICT (template_name) DO NOTHING;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_study_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;

COMMENT ON TABLE push_subscriptions IS 'Stores user push notification subscriptions for web push notifications';
COMMENT ON TABLE study_reminders IS 'Stores scheduled study reminders for users';
COMMENT ON TABLE notification_logs IS 'Logs all sent notifications for analytics and debugging';
COMMENT ON TABLE notification_events IS 'Tracks user interactions with notifications';
COMMENT ON TABLE user_notification_preferences IS 'Stores user preferences for different notification types';
COMMENT ON TABLE study_streaks IS 'Tracks user study streaks for motivation and achievements';
COMMENT ON TABLE study_goals IS 'Stores user-defined study goals for personalized reminders';
COMMENT ON TABLE user_achievements IS 'Tracks user achievements to celebrate milestones';
COMMENT ON TABLE notification_queue IS 'Queues notifications for scheduled delivery';

-- Success message
SELECT 'AthroAI Notification System tables created successfully! 🔔📚✨' as status; 