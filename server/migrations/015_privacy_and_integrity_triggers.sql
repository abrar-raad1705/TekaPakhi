-- 015: Data Privacy & Integrity Triggers

-- 1. Security enforcement function
CREATE OR REPLACE FUNCTION teka.fn_enforce_internal_only()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the internal operation flag is set to 'true'
    IF current_setting('teka.internal_op', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Data Privacy Violation: Direct modification of financial records is prohibited. Use authorized procedures.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply triggers to transactions
DROP TRIGGER IF EXISTS trg_protect_transactions ON teka.transactions;
CREATE TRIGGER trg_protect_transactions
BEFORE INSERT OR UPDATE OR DELETE ON teka.transactions
FOR EACH ROW
EXECUTE FUNCTION teka.fn_enforce_internal_only();

-- 3. Apply triggers to ledger entries
DROP TRIGGER IF EXISTS trg_protect_ledger ON teka.ledger_entries;
CREATE TRIGGER trg_protect_ledger
BEFORE INSERT OR UPDATE OR DELETE ON teka.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION teka.fn_enforce_internal_only();

-- 4. Apply triggers to wallets (optional but recommended for balance integrity)
DROP TRIGGER IF EXISTS trg_protect_wallets ON teka.wallets;
CREATE TRIGGER trg_protect_wallets
BEFORE UPDATE ON teka.wallets
FOR EACH ROW
EXECUTE FUNCTION teka.fn_enforce_internal_only();
