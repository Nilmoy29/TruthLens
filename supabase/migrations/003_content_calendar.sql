-- Content Calendar Feature Migration
-- This migration adds tables for personalized AI content calendar functionality

-- Create content_preferences table to store user's healthy content preferences
CREATE TABLE content_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Content type preferences
    preferred_content_types JSONB DEFAULT '[]'::jsonb, -- Array of content types user wants to consume
    avoided_content_types JSONB DEFAULT '[]'::jsonb,   -- Array of content types user wants to avoid
    
    -- Daily consumption limits
    daily_time_limit_minutes INTEGER DEFAULT 120,      -- Daily time limit in minutes
    daily_article_limit INTEGER DEFAULT 10,            -- Max articles per day
    daily_video_limit INTEGER DEFAULT 5,               -- Max videos per day
    daily_social_limit INTEGER DEFAULT 30,             -- Max social media posts per day
    
    -- Content quality preferences
    min_credibility_score DECIMAL(3,2) DEFAULT 0.70,   -- Minimum credibility score (0-1)
    max_bias_score DECIMAL(3,2) DEFAULT 0.30,          -- Maximum bias score (0-1)
    
    -- Wellness goals
    wellness_goals JSONB DEFAULT '[]'::jsonb,          -- Array of wellness goals
    break_reminders_enabled BOOLEAN DEFAULT true,      -- Enable break reminders
    break_interval_minutes INTEGER DEFAULT 30,         -- Break reminder interval
    
    -- Content categories and weights
    content_categories JSONB DEFAULT '{
        "news": {"weight": 0.3, "enabled": true},
        "educational": {"weight": 0.4, "enabled": true},
        "entertainment": {"weight": 0.2, "enabled": true},
        "social": {"weight": 0.1, "enabled": true}
    }'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_calendar table for daily content recommendations
CREATE TABLE content_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Calendar date
    calendar_date DATE NOT NULL,
    
    -- AI-generated recommendations
    recommended_content JSONB DEFAULT '[]'::jsonb,     -- Array of recommended content items
    daily_theme TEXT,                                   -- Daily content theme (e.g., "Focus on Education")
    wellness_tip TEXT,                                  -- Daily wellness tip
    
    -- Consumption tracking
    planned_consumption JSONB DEFAULT '{
        "articles": [],
        "videos": [],
        "social_posts": [],
        "total_time_planned": 0
    }'::jsonb,
    
    actual_consumption JSONB DEFAULT '{
        "articles": [],
        "videos": [],
        "social_posts": [],
        "total_time_spent": 0
    }'::jsonb,
    
    -- Daily goals and achievements
    daily_goals JSONB DEFAULT '[]'::jsonb,             -- Array of daily goals
    goals_achieved JSONB DEFAULT '[]'::jsonb,          -- Array of achieved goals
    wellness_score DECIMAL(3,2),                       -- Daily wellness score (0-1)
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one calendar entry per user per day
    UNIQUE(user_id, calendar_date)
);

-- Create content_consumption_logs table for tracking actual content consumption
CREATE TABLE content_consumption_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_id UUID REFERENCES content_calendar(id) ON DELETE CASCADE,
    
    -- Content details
    content_type TEXT NOT NULL CHECK (content_type IN ('article', 'video', 'social_post', 'podcast', 'other')),
    content_url TEXT,
    content_title TEXT,
    content_source TEXT,
    content_category TEXT,
    
    -- Consumption metrics
    time_spent_minutes INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,   -- How much of content was consumed (0-100)
    
    -- Content analysis results
    credibility_score DECIMAL(3,2),                    -- Credibility score from fact-check
    bias_score DECIMAL(3,2),                           -- Bias score from bias analysis
    sentiment_score DECIMAL(3,2),                      -- Sentiment analysis score
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    flagged_as_unhealthy BOOLEAN DEFAULT false,
    
    -- Timestamps
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_alerts table for AI-generated alerts and recommendations
CREATE TABLE content_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'consumption_limit_warning',
        'unhealthy_content_detected',
        'break_reminder',
        'daily_goal_reminder',
        'weekly_summary',
        'content_recommendation'
    )),
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    
    -- Alert metadata
    metadata JSONB DEFAULT '{}'::jsonb,                -- Additional alert data
    action_required BOOLEAN DEFAULT false,             -- Whether user action is required
    action_url TEXT,                                    -- URL for user action
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'read', 'dismissed', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_content_preferences_user_id ON content_preferences(user_id);
CREATE INDEX idx_content_calendar_user_id ON content_calendar(user_id);
CREATE INDEX idx_content_calendar_date ON content_calendar(calendar_date DESC);
CREATE INDEX idx_content_calendar_user_date ON content_calendar(user_id, calendar_date);
CREATE INDEX idx_consumption_logs_user_id ON content_consumption_logs(user_id);
CREATE INDEX idx_consumption_logs_calendar_id ON content_consumption_logs(calendar_id);
CREATE INDEX idx_consumption_logs_consumed_at ON content_consumption_logs(consumed_at DESC);
CREATE INDEX idx_content_alerts_user_id ON content_alerts(user_id);
CREATE INDEX idx_content_alerts_status ON content_alerts(status);
CREATE INDEX idx_content_alerts_created_at ON content_alerts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE content_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own content preferences" ON content_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own content calendar" ON content_calendar
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consumption logs" ON content_consumption_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own content alerts" ON content_alerts
    FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_content_preferences_updated_at BEFORE UPDATE ON content_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_calendar_updated_at BEFORE UPDATE ON content_calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_alerts_updated_at BEFORE UPDATE ON content_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default content preferences for existing users
INSERT INTO content_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM content_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;