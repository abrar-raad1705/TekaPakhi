-- 009_auth_tables.sql
-- Add authentication support: brute force protection, OTP codes, refresh tokens

-- 1. Add brute force protection columns to profiles
ALTER TABLE tp.profiles
ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- 2. OTP codes table
CREATE TABLE IF NOT EXISTS tp.otp_codes (
    otp_id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'VERIFY_PHONE', -- VERIFY_PHONE, RESET_PIN
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_otp_phone CHECK (phone_number ~ '^01[3-9][0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON tp.otp_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON tp.otp_codes(expires_at);

-- 3. Refresh tokens table
CREATE TABLE IF NOT EXISTS tp.refresh_tokens (
    token_id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL REFERENCES tp.profiles(profile_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_profile ON tp.refresh_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON tp.refresh_tokens(token_hash);
