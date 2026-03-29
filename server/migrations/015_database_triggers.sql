-- 1. Privacy and Integrity Triggers
DROP TRIGGER IF EXISTS trg_protect_transactions ON transactions;
CREATE TRIGGER trg_protect_transactions
BEFORE INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_internal_only();

DROP TRIGGER IF EXISTS trg_protect_ledger ON ledger_entries;
CREATE TRIGGER trg_protect_ledger
BEFORE INSERT OR UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_internal_only();

DROP TRIGGER IF EXISTS trg_protect_wallets ON wallets;
CREATE TRIGGER trg_protect_wallets
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_internal_only();

DROP TRIGGER IF EXISTS trg_protect_wallets_delete ON wallets;
CREATE TRIGGER trg_protect_wallets_delete
BEFORE DELETE ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_internal_only();

-- 2. Transaction Integrity Triggers
DROP TRIGGER IF EXISTS trg_immutable_transaction_fields ON transactions;
CREATE TRIGGER trg_immutable_transaction_fields
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_transaction_immutable_fields();

DROP TRIGGER IF EXISTS trg_transaction_status_flow ON transactions;
CREATE TRIGGER trg_transaction_status_flow
BEFORE UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_status_transition();

-- 3. Ledger Triggers
DROP TRIGGER IF EXISTS trg_ledger_immutable ON ledger_entries;
CREATE TRIGGER trg_ledger_immutable
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION fn_ledger_no_update();

-- 4. Wallet Safety Triggers
DROP TRIGGER IF EXISTS trg_wallet_no_negative ON wallets;
CREATE TRIGGER trg_wallet_no_negative
BEFORE INSERT OR UPDATE OF balance ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_wallet_no_negative();

DROP TRIGGER IF EXISTS trg_wallet_max_balance_guard ON wallets;
CREATE TRIGGER trg_wallet_max_balance_guard
BEFORE INSERT OR UPDATE OF balance ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_wallet_max_balance_guard();

-- 5. OTP Triggers
DROP TRIGGER IF EXISTS trg_otp_auto_expire ON otp_codes;
CREATE TRIGGER trg_otp_auto_expire
AFTER INSERT ON otp_codes
FOR EACH ROW
EXECUTE FUNCTION fn_otp_auto_expire();

-- 6. Auto-Update Timestamp Triggers
DROP TRIGGER IF EXISTS trg_auto_updated_at_profiles ON profiles;
CREATE TRIGGER trg_auto_updated_at_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_auto_updated_at_wallets ON wallets;
CREATE TRIGGER trg_auto_updated_at_wallets
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_auto_updated_at_transactions ON transactions;
CREATE TRIGGER trg_auto_updated_at_transactions
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_auto_updated_at_customer_profiles ON customer_profiles;
CREATE TRIGGER trg_auto_updated_at_customer_profiles
BEFORE UPDATE ON customer_profiles
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_auto_updated_at_agent_profiles ON agent_profiles;
CREATE TRIGGER trg_auto_updated_at_agent_profiles
BEFORE UPDATE ON agent_profiles
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_auto_updated_at_distributor_profiles ON distributor_profiles;
CREATE TRIGGER trg_auto_updated_at_distributor_profiles
BEFORE UPDATE ON distributor_profiles
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_auto_updated_at_merchant_profiles ON merchant_profiles;
CREATE TRIGGER trg_auto_updated_at_merchant_profiles
BEFORE UPDATE ON merchant_profiles
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();

DROP TRIGGER IF EXISTS trg_auto_updated_at_biller_profiles ON biller_profiles;
CREATE TRIGGER trg_auto_updated_at_biller_profiles
BEFORE UPDATE ON biller_profiles
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_timestamp();
