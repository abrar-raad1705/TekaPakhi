-- 012_audit_and_updated_at_triggers.sql
-- Add audit logging for wallet balance changes and automate updated_at timestamps.

CREATE SCHEMA IF NOT EXISTS tp;

-- 1. Create Wallet Audits table
CREATE TABLE IF NOT EXISTS tp.wallet_audits (
    audit_id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES tp.wallets(wallet_id),
    old_balance DECIMAL(15, 2),
    new_balance DECIMAL(15, 2),
    change_amount DECIMAL(15, 2),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Function to log wallet changes
CREATE OR REPLACE FUNCTION tp.log_wallet_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.balance != NEW.balance THEN
        INSERT INTO tp.wallet_audits (wallet_id, old_balance, new_balance, change_amount)
        VALUES (NEW.wallet_id, OLD.balance, NEW.balance, NEW.balance - OLD.balance);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger for wallet balance changes
DROP TRIGGER IF EXISTS trg_wallet_audit ON tp.wallets;
CREATE TRIGGER trg_wallet_audit
AFTER UPDATE OF balance ON tp.wallets
FOR EACH ROW
EXECUTE FUNCTION tp.log_wallet_balance_change();

-- 4. General function to update updated_at timestamp
CREATE OR REPLACE FUNCTION tp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Add updated_at columns and triggers to major tables

-- Wallets
ALTER TABLE tp.wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON tp.wallets;
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON tp.wallets FOR EACH ROW EXECUTE FUNCTION tp.update_updated_at_column();

-- Profiles
ALTER TABLE tp.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON tp.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON tp.profiles FOR EACH ROW EXECUTE FUNCTION tp.update_updated_at_column();

-- Transaction Types
ALTER TABLE tp.transaction_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
DROP TRIGGER IF EXISTS trg_tx_types_updated_at ON tp.transaction_types;
CREATE TRIGGER trg_tx_types_updated_at BEFORE UPDATE ON tp.transaction_types FOR EACH ROW EXECUTE FUNCTION tp.update_updated_at_column();

-- Commission Policies
ALTER TABLE tp.commission_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
DROP TRIGGER IF EXISTS trg_comm_policies_updated_at ON tp.commission_policies;
CREATE TRIGGER trg_comm_policies_updated_at BEFORE UPDATE ON tp.commission_policies FOR EACH ROW EXECUTE FUNCTION tp.update_updated_at_column();
