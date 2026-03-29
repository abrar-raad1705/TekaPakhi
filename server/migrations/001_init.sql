-- 1. ENUM TYPES (For fixed categories)
CREATE TYPE profile_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_KYC', 'BLOCKED');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE fee_bearer_type AS ENUM ('SENDER', 'RECEIVER');

-- 2. PROFILE & AUTHENTICATION
CREATE TABLE profile_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    default_max_balance DECIMAL(15,2) NOT NULL
);

-- Base Profile Table (Parent)
CREATE TABLE profiles (
    profile_id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    security_pin_hash VARCHAR(255) NOT NULL,
    nid_number VARCHAR(20),
    is_phone_verified BOOLEAN DEFAULT FALSE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type_id INTEGER NOT NULL REFERENCES profile_types(type_id),
    is_internal BOOLEAN DEFAULT FALSE,
    failed_pin_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    profile_picture_url TEXT DEFAULT NULL,
    pin_reset_granted BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT check_bd_phone CHECK (phone_number ~ '^01[3-9][0-9]{8}$')
);



-- 3. PROFILE SUBTYPES (Inheritance via Shared PK)
-- Customer Profile
CREATE TABLE customer_profiles (
    profile_id BIGINT PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
    approved_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status profile_status DEFAULT 'ACTIVE'
);

-- Distributor Profile
CREATE TABLE distributor_profiles (
    profile_id BIGINT PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
    region VARCHAR(100),
    approved_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status profile_status DEFAULT 'ACTIVE'
);

-- Biller Profile
CREATE TABLE biller_profiles (
    profile_id BIGINT PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    status profile_status DEFAULT 'ACTIVE'
);

-- Agent Profile
CREATE TABLE agent_profiles (
    profile_id BIGINT PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
    agent_code VARCHAR(20) UNIQUE NOT NULL,
    shop_name VARCHAR(100) NOT NULL,
    shop_address TEXT,
    approved_date TIMESTAMP WITH TIME ZONE,
    status profile_status DEFAULT 'PENDING_KYC'
);

-- Merchant Profile
CREATE TABLE merchant_profiles (
    profile_id BIGINT PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
    merchant_code VARCHAR(20) UNIQUE NOT NULL,
    business_name VARCHAR(100) NOT NULL,
    business_type VARCHAR(50),
    approved_date TIMESTAMP WITH TIME ZONE,
    status profile_status DEFAULT 'PENDING_KYC'
);

-- 4. Wallets
CREATE TYPE wallet_role AS ENUM ('TREASURY', 'REVENUE', 'ADJUSTMENT');

CREATE TABLE wallets (
    wallet_id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT UNIQUE NOT NULL REFERENCES profiles(profile_id) ON DELETE RESTRICT,
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    max_balance DECIMAL(15, 2) DEFAULT 500000.00,
    role wallet_role, -- NULL for normal users
    last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



-- 5. CONTACTS
CREATE TABLE saved_recipients (
    recipient_id SERIAL PRIMARY KEY,
    saver_profile_id BIGINT NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    target_profile_id BIGINT NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    nickname VARCHAR(50),
    added_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(saver_profile_id, target_profile_id)
);

-- 6. TRANSACTIONS & RULES
CREATE TABLE transaction_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL, -- 'Send Money', 'Cash Out' etc.
    fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
    fee_flat_amount DECIMAL(10, 2) DEFAULT 0.00,
    fee_bearer fee_bearer_type,
    fee_min_amount DECIMAL(10, 2),
    fee_max_amount DECIMAL(10, 2),

    CONSTRAINT chk_fee_min_max CHECK (
        fee_min_amount IS NULL
        OR fee_max_amount IS NULL
        OR fee_min_amount <= fee_max_amount
    )
);

-- TRANSACTION Limit Policies
CREATE TABLE transaction_limits (
    profile_type_id INTEGER REFERENCES profile_types(type_id),
    transaction_type_id INTEGER REFERENCES transaction_types(type_id),
    daily_limit DECIMAL(15, 2),
    monthly_limit DECIMAL(15, 2),
    max_count_daily INTEGER,
    max_count_monthly INTEGER,
    min_per_transaction DECIMAL(15, 2),
    max_per_transaction DECIMAL(15, 2),

    PRIMARY KEY (profile_type_id, transaction_type_id)
);

CREATE TABLE commission_policies (
    profile_type_id INTEGER REFERENCES profile_types(type_id), -- e.g., 'Agent'
    transaction_type_id INTEGER REFERENCES transaction_types(type_id), -- e.g., 'Cash Out'
    commission_share DECIMAL(5, 2) NOT NULL, -- Percentage (e.g., 2.00)

    PRIMARY KEY (profile_type_id, transaction_type_id)
);

CREATE TABLE transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    transaction_ref VARCHAR(40) UNIQUE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    fee_amount DECIMAL(10, 2) DEFAULT 0.00,
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status transaction_status DEFAULT 'PENDING',
    user_note VARCHAR(255),
    -- Participants
    sender_wallet_id BIGINT NOT NULL REFERENCES wallets(wallet_id),
    receiver_wallet_id BIGINT NOT NULL REFERENCES wallets(wallet_id),
    type_id INTEGER NOT NULL REFERENCES transaction_types(type_id),
    -- For Reversals
    original_transaction_id BIGINT REFERENCES transactions(transaction_id),

    CONSTRAINT check_different_wallets CHECK (sender_wallet_id != receiver_wallet_id)
);



-- Double-entry ledger
CREATE TYPE ledger_entry_type AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(transaction_id),
    wallet_id BIGINT NOT NULL REFERENCES wallets(wallet_id),
    entry_type ledger_entry_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



--OTP codes table
CREATE TABLE otp_codes (
    otp_id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'VERIFY_PHONE', -- VERIFY_PHONE, RESET_PIN
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_otp_phone CHECK (phone_number ~ '^01[3-9][0-9]{8}$')
);
