-- Billing Portal Database Schema
-- PostgreSQL DDL Script
-- Run this script to create the complete database schema

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    business_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    billing_address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    plan_interval VARCHAR(20) NOT NULL, -- 'month', 'quarter', 'semiannual', 'year'
    status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', etc.
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY, -- e.g. "monthly", "quarterly", "semiannual", "annual"
    stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    interval VARCHAR(20) NOT NULL, -- "month", "quarter", "semiannual", "year"
    amount_cents INTEGER NOT NULL,
    description TEXT,
    features TEXT[] DEFAULT '{}', -- JSON array of features
    popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id ON plans(stripe_price_id);

-- Trigger function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at 
    BEFORE UPDATE ON plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample plans (you'll need to replace stripe_price_id values with your actual Stripe Price IDs)
INSERT INTO plans (id, stripe_price_id, name, interval, amount_cents, description, features, popular) VALUES
('monthly', 'price_monthly_replace_with_actual_id', 'Monthly', 'month', 2900, 'Perfect for getting started', ARRAY['Full access', 'Email support', 'Basic analytics'], false),
('quarterly', 'price_quarterly_replace_with_actual_id', 'Quarterly', 'quarter', 2500, 'Best value for regular usage', ARRAY['Full access', 'Priority support', 'Advanced analytics', '15% savings'], true),
('semiannual', 'price_semiannual_replace_with_actual_id', 'Semi-Annual', 'semiannual', 2200, 'Great for established businesses', ARRAY['Full access', 'Priority support', 'Advanced analytics', '25% savings'], false),
('annual', 'price_annual_replace_with_actual_id', 'Annual', 'year', 1900, 'Maximum savings for committed users', ARRAY['Full access', 'Priority support', 'Advanced analytics', '35% savings'], false)
ON CONFLICT (id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with profile and billing information';
COMMENT ON TABLE password_reset_tokens IS 'Secure tokens for password reset functionality';
COMMENT ON TABLE stripe_customers IS 'Links users to their Stripe customer records';
COMMENT ON TABLE subscriptions IS 'User subscriptions with billing status tracking';
COMMENT ON TABLE plans IS 'Available subscription plans with pricing tiers';

COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (prevents reuse)';
COMMENT ON COLUMN subscriptions.plan_interval IS 'Billing frequency: month, quarter, semiannual, year';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status: active, canceled, past_due, etc.';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription cancels at end of current period';
COMMENT ON COLUMN plans.amount_cents IS 'Price in cents (e.g., 2900 = $29.00)';
COMMENT ON COLUMN plans.features IS 'Array of plan features for display';

-- Grant permissions (adjust role name as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT;