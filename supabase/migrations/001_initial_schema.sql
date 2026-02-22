-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create fact_checks table
CREATE TABLE fact_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    credibility_score INTEGER CHECK (credibility_score >= 0 AND credibility_score <= 100),
    analysis TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    flags JSONB DEFAULT '[]'::jsonb,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    methodology JSONB DEFAULT '[]'::jsonb,
    timestamp BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bias_analyses table
CREATE TABLE bias_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    political_bias TEXT,
    bias_confidence INTEGER CHECK (bias_confidence >= 0 AND bias_confidence <= 100),
    emotional_tone TEXT,
    analysis TEXT,
    bias_indicators JSONB DEFAULT '[]'::jsonb,
    bias_score INTEGER CHECK (bias_score >= 0 AND bias_score <= 100),
    timestamp BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media_verifications table
CREATE TABLE media_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- file name or description
    file_info JSONB,
    authenticity JSONB,
    technical_analysis JSONB,
    deepfake_analysis JSONB,
    manipulation_flags JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    timestamp BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    location TEXT,
    bio TEXT,
    website TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    total_analyses INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}'::jsonb,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_logs table for tracking API usage
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_fact_checks_user_id ON fact_checks(user_id);
CREATE INDEX idx_fact_checks_created_at ON fact_checks(created_at DESC);
CREATE INDEX idx_bias_analyses_user_id ON bias_analyses(user_id);
CREATE INDEX idx_bias_analyses_created_at ON bias_analyses(created_at DESC);
CREATE INDEX idx_media_verifications_user_id ON media_verifications(user_id);
CREATE INDEX idx_media_verifications_created_at ON media_verifications(created_at DESC);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_fact_checks_updated_at BEFORE UPDATE ON fact_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bias_analyses_updated_at BEFORE UPDATE ON bias_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_verifications_updated_at BEFORE UPDATE ON media_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing public access for now since auth is disabled)
CREATE POLICY "Allow all operations on fact_checks" ON fact_checks FOR ALL USING (true);
CREATE POLICY "Allow all operations on bias_analyses" ON bias_analyses FOR ALL USING (true);
CREATE POLICY "Allow all operations on media_verifications" ON media_verifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_settings" ON user_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations on subscriptions" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Allow all operations on usage_logs" ON usage_logs FOR ALL USING (true);