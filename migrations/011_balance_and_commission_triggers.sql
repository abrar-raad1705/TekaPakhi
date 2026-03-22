-- 011_balance_and_commission_triggers.sql
-- Move core financial logic into DB triggers for atomicity and integrity.

CREATE SCHEMA IF NOT EXISTS tp;

-- 1. Add tracking columns to transactions
ALTER TABLE tp.transactions
ADD COLUMN IF NOT EXISTS sender_debit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS receiver_credit DECIMAL(15, 2);

-- 2. Function to process balances after a transaction is completed
CREATE OR REPLACE FUNCTION tp.process_transaction_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process COMPLETED transactions
    IF NEW.status = 'COMPLETED' THEN
        -- Debit sender
        IF NEW.sender_wallet_id IS NOT NULL AND NEW.sender_debit > 0 THEN
            UPDATE tp.wallets 
            SET balance = balance - NEW.sender_debit,
                last_activity_date = NOW()
            WHERE wallet_id = NEW.sender_wallet_id;
        END IF;

        -- Credit receiver
        IF NEW.receiver_wallet_id IS NOT NULL AND NEW.receiver_credit > 0 THEN
            UPDATE tp.wallets 
            SET balance = balance + NEW.receiver_credit,
                last_activity_date = NOW()
            WHERE wallet_id = NEW.receiver_wallet_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to distribute commissions automatically
CREATE OR REPLACE FUNCTION tp.distribute_transaction_commissions()
RETURNS TRIGGER AS $$
DECLARE
    v_policy RECORD;
    v_commission_amount DECIMAL(10, 2);
    v_beneficiary_wallet_id BIGINT;
    v_sender_type_id INTEGER;
    v_receiver_type_id INTEGER;
BEGIN
    -- Only for COMPLETED transactions with a fee
    IF NEW.status = 'COMPLETED' AND NEW.fee_amount > 0 THEN
        -- Get participant type IDs
        SELECT type_id INTO v_sender_type_id FROM tp.profiles p JOIN tp.wallets w ON p.profile_id = w.profile_id WHERE w.wallet_id = NEW.sender_wallet_id;
        SELECT type_id INTO v_receiver_type_id FROM tp.profiles p JOIN tp.wallets w ON p.profile_id = w.profile_id WHERE w.wallet_id = NEW.receiver_wallet_id;

        -- Loop through applicable commission policies for this transaction type
        FOR v_policy IN 
            SELECT cp.* 
            FROM tp.commission_policies cp
            WHERE cp.transaction_type_id = NEW.type_id
        LOOP
            -- Calculate commission based on fee_amount and share percentage
            v_commission_amount := (NEW.fee_amount * v_policy.commission_share) / 100.0;
            
            v_beneficiary_wallet_id := NULL;

            -- If beneficiary type matches sender
            IF v_policy.profile_type_id = v_sender_type_id THEN
                v_beneficiary_wallet_id := NEW.sender_wallet_id;
            -- Else if beneficiary type matches receiver
            ELSIF v_policy.profile_type_id = v_receiver_type_id THEN
                v_beneficiary_wallet_id := NEW.receiver_wallet_id;
            -- Else check for System wallet (fallback)
            ELSE
                SELECT wallet_id INTO v_beneficiary_wallet_id 
                FROM tp.wallets w 
                JOIN tp.profiles p ON w.profile_id = p.profile_id 
                JOIN tp.profile_types pt ON p.type_id = pt.type_id
                WHERE pt.type_name = 'SYSTEM' LIMIT 1;
            END IF;

            IF v_beneficiary_wallet_id IS NOT NULL AND v_commission_amount > 0 THEN
                -- Insert commission entry
                INSERT INTO tp.commission_entries (transaction_id, beneficiary_wallet_id, commission_amount)
                VALUES (NEW.transaction_id, v_beneficiary_wallet_id, v_commission_amount);

                -- Credit beneficiary wallet
                UPDATE tp.wallets 
                SET balance = balance + v_commission_amount,
                    last_activity_date = NOW()
                WHERE wallet_id = v_beneficiary_wallet_id;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Triggers
DROP TRIGGER IF EXISTS trg_wallet_balance_update ON tp.transactions;
CREATE TRIGGER trg_wallet_balance_update
AFTER INSERT ON tp.transactions
FOR EACH ROW
EXECUTE FUNCTION tp.process_transaction_balances();

DROP TRIGGER IF EXISTS trg_commission_distribution ON tp.transactions;
CREATE TRIGGER trg_commission_distribution
AFTER INSERT ON tp.transactions
FOR EACH ROW
EXECUTE FUNCTION tp.distribute_transaction_commissions();
