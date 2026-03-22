-- 013_trigger_cleanup_and_fix.sql
-- Drop only USER-DEFINED redundant triggers and re-create clean versions.
-- This fixes "double transaction" issues caused by overlapping legacy triggers.

-- 1. Drop USER-DEFINED triggers on transactions table (tp schema)
DO $$
DECLARE
    trgname RECORD;
BEGIN
    FOR trgname IN (
        SELECT tgname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
        WHERE relname = 'transactions' AND tgisinternal = false
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trgname.tgname) || ' ON tp.transactions;';
    END LOOP;
END $$;

-- 2. Drop USER-DEFINED triggers on wallets table (tp schema)
DO $$
DECLARE
    trgname RECORD;
BEGIN
    FOR trgname IN (
        SELECT tgname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
        WHERE relname = 'wallets' AND tgisinternal = false
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trgname.tgname) || ' ON tp.wallets;';
    END LOOP;
END $$;

-- 3. Re-create the verified balance update trigger
DROP TRIGGER IF EXISTS trg_wallet_balance_update ON tp.transactions;
CREATE TRIGGER trg_wallet_balance_update
AFTER INSERT ON tp.transactions
FOR EACH ROW
EXECUTE FUNCTION tp.process_transaction_balances();

-- 4. Re-create the verified commission distribution trigger
DROP TRIGGER IF EXISTS trg_commission_distribution ON tp.transactions;
CREATE TRIGGER trg_commission_distribution
AFTER INSERT ON tp.transactions
FOR EACH ROW
EXECUTE FUNCTION tp.distribute_transaction_commissions();

-- 5. Re-create the verified wallet audit trigger
DROP TRIGGER IF EXISTS trg_wallet_audit ON tp.wallets;
CREATE TRIGGER trg_wallet_audit
AFTER UPDATE OF balance ON tp.wallets
FOR EACH ROW
EXECUTE FUNCTION tp.log_wallet_balance_change();

-- 6. Ensure updated_at triggers are clean
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON tp.wallets;
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON tp.wallets FOR EACH ROW EXECUTE FUNCTION tp.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON tp.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON tp.profiles FOR EACH ROW EXECUTE FUNCTION tp.update_updated_at_column();

-- 7. Fix any missing or misaligned wallet audits
INSERT INTO tp.wallet_audits (wallet_id, old_balance, new_balance, change_amount)
SELECT wallet_id, balance, balance, 0 
FROM tp.wallets w
WHERE NOT EXISTS (SELECT 1 FROM tp.wallet_audits wa WHERE wa.wallet_id = w.wallet_id)
ON CONFLICT DO NOTHING;
