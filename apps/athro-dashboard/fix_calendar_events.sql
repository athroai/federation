-- ✅ QUICK FIX: Add missing columns to calendar_events table
-- Run this in your Supabase SQL Editor to fix the "notification_scheduled" error

-- First, ensure the calendar_events table exists with all required columns
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type TEXT DEFAULT 'study',
    subject TEXT,
    notification_scheduled BOOLEAN DEFAULT false,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns safely
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS notification_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'study',
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON calendar_events;
CREATE POLICY "Users can manage their own calendar events" 
    ON calendar_events FOR ALL 
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON calendar_events TO authenticated, service_role;

SELECT 'Calendar events table fixed! ✅' as status; 