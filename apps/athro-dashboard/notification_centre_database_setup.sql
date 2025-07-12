-- ✅ ATHROAI NOTIFICATION CENTRE - PRODUCTION DATABASE SETUP
-- This creates the complete database schema for the advanced notification system

-- 1. Enhanced notification_preferences table with all requested features
DROP TABLE IF EXISTS notification_preferences CASCADE;
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Delivery Method Preferences
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    inapp_enabled BOOLEAN DEFAULT true,
    
    -- Category Preferences
    calendar_reminders_enabled BOOLEAN DEFAULT true,
    calendar_reminder_minutes INTEGER DEFAULT 15 CHECK (calendar_reminder_minutes IN (5, 10, 15)),
    
    hints_tips_enabled BOOLEAN DEFAULT true,
    athro_unused_days INTEGER DEFAULT 30 CHECK (athro_unused_days >= 1),
    study_tools_unused_days INTEGER DEFAULT 14 CHECK (study_tools_unused_days >= 1),
    resources_upload_nudge_days INTEGER DEFAULT 7 CHECK (resources_upload_nudge_days >= 1),
    
    low_token_warning_enabled BOOLEAN DEFAULT true,
    low_token_threshold_percentage INTEGER DEFAULT 10 CHECK (low_token_threshold_percentage BETWEEN 1 AND 50),
    
    -- Night Silencing (10 PM - 8 AM)
    night_silence_enabled BOOLEAN DEFAULT true,
    night_silence_start TIME DEFAULT '22:00:00',
    night_silence_end TIME DEFAULT '08:00:00',
    
    -- Legacy support fields
    achievement_notifications BOOLEAN DEFAULT true,
    reminder_notifications BOOLEAN DEFAULT true,
    social_notifications BOOLEAN DEFAULT true,
    system_notifications BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Calendar events table with notification scheduling
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type TEXT DEFAULT 'study' CHECK (event_type IN ('study', 'exam', 'assignment', 'revision', 'break')),
    subject TEXT,
    notification_scheduled BOOLEAN DEFAULT false,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User activity tracking for hints & tips
CREATE TABLE IF NOT EXISTS user_activity_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('athro_usage', 'study_tool_usage', 'resource_upload', 'login', 'study_session')),
    athro_id TEXT NULL, -- For athro-specific tracking
    tool_type TEXT NULL, -- For study tool tracking: 'quiz', 'flashcard', 'notes', etc.
    subject TEXT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notifications queue for scheduled delivery
CREATE TABLE IF NOT EXISTS notifications_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('calendar_reminder', 'athro_tip', 'study_tool_reminder', 'resource_upload_nudge', 'low_token_warning', 'achievement', 'system')),
    
    -- Delivery preferences
    deliver_via_push BOOLEAN DEFAULT false,
    deliver_via_email BOOLEAN DEFAULT false,
    deliver_via_inapp BOOLEAN DEFAULT false,
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT NULL,
    icon_type TEXT DEFAULT 'info' CHECK (icon_type IN ('info', 'warning', 'success', 'reminder', 'tip')),
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ NULL,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'cancelled')),
    
    -- Context data
    related_event_id UUID NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    athro_id TEXT NULL,
    subject TEXT NULL,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notification delivery log
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_queue_id UUID REFERENCES notifications_queue(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('push', 'email', 'inapp')),
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'failed', 'opened', 'clicked')),
    error_message TEXT NULL,
    delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Token usage tracking for low token warnings
CREATE TABLE IF NOT EXISTS token_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tokens_used INTEGER NOT NULL,
    tokens_remaining INTEGER NOT NULL,
    usage_type TEXT NOT NULL CHECK (usage_type IN ('chat', 'quiz_generation', 'flashcard_creation', 'note_processing', 'athro_interaction')),
    athro_id TEXT NULL,
    subject TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_notification_scheduled ON calendar_events(notification_scheduled, start_time);

CREATE INDEX IF NOT EXISTS idx_user_activity_tracking_user_id ON user_activity_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_tracking_type ON user_activity_tracking(activity_type, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_tracking_athro ON user_activity_tracking(user_id, athro_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_queue_user_id ON notifications_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_queue_scheduled ON notifications_queue(scheduled_for, delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_queue_status ON notifications_queue(delivery_status);

CREATE INDEX IF NOT EXISTS idx_token_usage_log_user_id ON token_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_log_created_at ON token_usage_log(created_at);

-- ROW LEVEL SECURITY
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- notification_preferences
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own notification preferences" 
ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- calendar_events
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON calendar_events;
CREATE POLICY "Users can manage their own calendar events" 
ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- user_activity_tracking
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_tracking;
CREATE POLICY "Users can view their own activity" 
ON user_activity_tracking FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert activity" ON user_activity_tracking;
CREATE POLICY "Service can insert activity" 
ON user_activity_tracking FOR INSERT WITH CHECK (true);

-- notifications_queue
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications_queue;
CREATE POLICY "Users can view their own notifications" 
ON notifications_queue FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage notifications" ON notifications_queue;
CREATE POLICY "Service can manage notifications" 
ON notifications_queue FOR ALL WITH CHECK (true);

-- notification_delivery_log
DROP POLICY IF EXISTS "Users can view their own delivery log" ON notification_delivery_log;
CREATE POLICY "Users can view their own delivery log" 
ON notification_delivery_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can manage delivery log" ON notification_delivery_log;
CREATE POLICY "Service can manage delivery log" 
ON notification_delivery_log FOR ALL WITH CHECK (true);

-- token_usage_log
DROP POLICY IF EXISTS "Users can view their own token usage" ON token_usage_log;
CREATE POLICY "Users can view their own token usage" 
ON token_usage_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert token usage" ON token_usage_log;
CREATE POLICY "Service can insert token usage" 
ON token_usage_log FOR INSERT WITH CHECK (true);

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_queue_updated_at ON notifications_queue;
CREATE TRIGGER update_notifications_queue_updated_at
    BEFORE UPDATE ON notifications_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HELPER FUNCTIONS

-- Function to get user's notification preferences with defaults
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS notification_preferences AS $$
DECLARE
    prefs notification_preferences;
BEGIN
    SELECT * INTO prefs FROM notification_preferences WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Return default preferences
        INSERT INTO notification_preferences (user_id) VALUES (p_user_id) 
        ON CONFLICT (user_id) DO NOTHING
        RETURNING * INTO prefs;
        
        IF NOT FOUND THEN
            SELECT * INTO prefs FROM notification_preferences WHERE user_id = p_user_id;
        END IF;
    END IF;
    
    RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current time is in night silence period
CREATE OR REPLACE FUNCTION is_night_silence_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    prefs notification_preferences;
    current_time TIME;
    user_timezone TEXT;
BEGIN
    SELECT * INTO prefs FROM get_user_notification_preferences(p_user_id);
    
    IF NOT prefs.night_silence_enabled THEN
        RETURN false;
    END IF;
    
    -- Get current time (you might want to adjust for user timezone)
    current_time := CURRENT_TIME;
    
    -- Check if current time is between night_silence_start and night_silence_end
    IF prefs.night_silence_start <= prefs.night_silence_end THEN
        -- Same day range (e.g., 22:00 to 23:00)
        RETURN current_time BETWEEN prefs.night_silence_start AND prefs.night_silence_end;
    ELSE
        -- Cross midnight range (e.g., 22:00 to 08:00)
        RETURN current_time >= prefs.night_silence_start OR current_time <= prefs.night_silence_end;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next delivery time (respecting night silence)
CREATE OR REPLACE FUNCTION calculate_next_delivery_time(p_user_id UUID, p_scheduled_for TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    prefs notification_preferences;
    delivery_time TIMESTAMPTZ;
    delivery_date DATE;
    morning_time TIME;
BEGIN
    SELECT * INTO prefs FROM get_user_notification_preferences(p_user_id);
    
    delivery_time := p_scheduled_for;
    
    IF prefs.night_silence_enabled THEN
        -- Extract date and time
        delivery_date := delivery_time::DATE;
        
        -- Check if scheduled time falls in night silence period
        IF (delivery_time::TIME BETWEEN prefs.night_silence_start AND TIME '23:59:59' AND prefs.night_silence_start > prefs.night_silence_end)
           OR (delivery_time::TIME BETWEEN TIME '00:00:00' AND prefs.night_silence_end AND prefs.night_silence_start > prefs.night_silence_end)
           OR (delivery_time::TIME BETWEEN prefs.night_silence_start AND prefs.night_silence_end AND prefs.night_silence_start <= prefs.night_silence_end) THEN
            
            -- If scheduled during night hours, delay to next morning
            IF delivery_time::TIME >= prefs.night_silence_start AND prefs.night_silence_start > prefs.night_silence_end THEN
                -- Same day, delay to next morning
                delivery_time := (delivery_date + INTERVAL '1 day')::TIMESTAMP + prefs.night_silence_end;
            ELSE
                -- Early morning, delay to same day morning
                delivery_time := delivery_date::TIMESTAMP + prefs.night_silence_end;
            END IF;
        END IF;
    END IF;
    
    RETURN delivery_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GRANT PERMISSIONS
GRANT ALL ON notification_preferences TO authenticated, service_role;
GRANT ALL ON calendar_events TO authenticated, service_role;
GRANT ALL ON user_activity_tracking TO authenticated, service_role;
GRANT ALL ON notifications_queue TO authenticated, service_role;
GRANT ALL ON notification_delivery_log TO authenticated, service_role;
GRANT ALL ON token_usage_log TO authenticated, service_role;

-- Insert default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Success message
SELECT 'AthroAI Notification Centre database setup completed successfully! 🎉' as status; 