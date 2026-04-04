-- 1. Ensure columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE distributor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE biller_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DROP PROCEDURE IF EXISTS sp_execute_transaction;
-- 2. Create the procedure
CREATE OR REPLACE PROCEDURE sp_execute_transaction(
    p_sender_wallet_id BIGINT,
    p_receiver_wallet_id BIGINT,
    p_amount DECIMAL(15,2),
    p_type_id INT,
    p_transaction_ref VARCHAR(100),
    INOUT p_transaction_id BIGINT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Metadata
    v_type_name VARCHAR(50);
    v_fee_bearer fee_bearer_type;
    v_sender_profile_id BIGINT;
    v_sender_type_id INT;
    v_sender_status TEXT;
    v_receiver_profile_id BIGINT;
    v_receiver_type_id INT;
    v_receiver_status TEXT;
    
    -- Calculation results
    v_calculated_fee DECIMAL(15,2);
    v_sender_debit DECIMAL(15,2);
    v_receiver_credit DECIMAL(15,2);
    v_limit_error TEXT;
    
    -- Auxiliary Wallets
    v_revenue_wallet_id BIGINT;
    v_treasury_wallet_id BIGINT;
    
    -- Logic state
    v_before_bal DECIMAL(15,2);
    v_after_bal DECIMAL(15,2);
    v_tx_id BIGINT;
    v_wid BIGINT;
    
    -- Commission Tracking
    v_policy RECORD;
    v_beneficiary_profile_id BIGINT;
    v_beneficiary_wallet_id BIGINT;
    v_share_amount DECIMAL(15,2);
    
    -- Locking
    v_lock_wallets BIGINT[] := '{}';
    
    -- Commission Storage (Array-based to avoid temp tables for performance)
    v_comm_wallet_ids BIGINT[] := '{}';
    v_comm_amounts DECIMAL(15,2) [] := '{}';
    v_comm_descriptions TEXT[] := '{}';
BEGIN
    -- 1. Metadata Retrieval
    SELECT type_name, fee_bearer INTO v_type_name, v_fee_bearer 
    FROM transaction_types WHERE type_id = p_type_id;

    IF v_type_name IS NULL THEN
        RAISE EXCEPTION 'Invalid transaction type ID: %', p_type_id;
    END IF;

    -- Resolve profiles and status
    SELECT profile_id, type_id, account_status INTO v_sender_profile_id, v_sender_type_id, v_sender_status
    FROM wallets JOIN profiles USING (profile_id) WHERE wallet_id = p_sender_wallet_id;
    
    SELECT profile_id, type_id, account_status INTO v_receiver_profile_id, v_receiver_type_id, v_receiver_status
    FROM wallets JOIN profiles USING (profile_id) WHERE wallet_id = p_receiver_wallet_id;

    -- 2. Validation
    SELECT fn_validate_transaction_preflight(v_sender_profile_id, v_receiver_profile_id, p_type_id, p_amount) INTO v_limit_error;
    IF v_limit_error IS NOT NULL THEN
        RAISE EXCEPTION '%', v_limit_error;
    END IF;

    -- 3. Precise Calculations

    -- Calculate fee via database function
    v_calculated_fee := fn_calculate_transaction_fee(p_type_id, p_amount, v_sender_profile_id, v_receiver_profile_id);

    -- Derive debit/credit amounts based on fee bearer
    IF v_fee_bearer = 'SENDER' THEN
        v_sender_debit  := p_amount + v_calculated_fee;
        v_receiver_credit := p_amount;
    ELSIF v_fee_bearer = 'RECEIVER' THEN
        v_sender_debit  := p_amount;
        v_receiver_credit := p_amount - v_calculated_fee;
    END IF;

    -- Soft Balance Check
    SELECT balance INTO v_before_bal FROM wallets WHERE wallet_id = p_sender_wallet_id;
    IF v_before_bal < v_sender_debit THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_sender_debit, v_before_bal;
    END IF;

    -- 4. Identify Auxiliary Parties
    SELECT wallet_id INTO v_revenue_wallet_id FROM wallets WHERE role = 'REVENUE' LIMIT 1;
    SELECT wallet_id INTO v_treasury_wallet_id FROM wallets WHERE role = 'TREASURY' LIMIT 1;

    -- 5. Commission Pre-Calculation
    FOR v_policy IN SELECT cp.*, pt.type_name as beneficiary_type_name 
                    FROM commission_policies cp
                    JOIN profile_types pt ON cp.profile_type_id = pt.type_id
                    WHERE cp.transaction_type_id = p_type_id 
    LOOP
        v_beneficiary_profile_id := NULL;
        IF v_policy.profile_type_id = v_sender_type_id THEN
            v_beneficiary_profile_id := v_sender_profile_id;
        ELSIF v_policy.profile_type_id = v_receiver_type_id THEN
            v_beneficiary_profile_id := v_receiver_profile_id;
        ELSIF v_policy.beneficiary_type_name = 'DISTRIBUTOR' THEN
            -- Resolve distributor link
            IF v_sender_type_id = 2 THEN 
                SELECT distributor_id INTO v_beneficiary_profile_id FROM agent_profiles WHERE profile_id = v_sender_profile_id;
            ELSIF v_receiver_type_id = 2 THEN 
                SELECT distributor_id INTO v_beneficiary_profile_id FROM agent_profiles WHERE profile_id = v_receiver_profile_id;
            END IF;
        END IF;

        IF v_beneficiary_profile_id IS NOT NULL THEN
            v_share_amount := ROUND((p_amount * v_policy.commission_share / 100), 2);
            IF v_share_amount > 0 THEN
                SELECT wallet_id INTO v_beneficiary_wallet_id FROM wallets WHERE profile_id = v_beneficiary_profile_id;
                IF v_beneficiary_wallet_id IS NOT NULL THEN
                    v_comm_wallet_ids := array_append(v_comm_wallet_ids, v_beneficiary_wallet_id);
                    v_comm_amounts := array_append(v_comm_amounts, v_share_amount);
                    v_comm_descriptions := array_append(v_comm_descriptions, 'Commission (' || v_policy.commission_share || '% to ' || v_policy.beneficiary_type_name || ')');
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- 6. Consolidated Locking (BATCH)
    v_lock_wallets := ARRAY[p_sender_wallet_id, p_receiver_wallet_id];
    IF v_revenue_wallet_id IS NOT NULL THEN v_lock_wallets := array_append(v_lock_wallets, v_revenue_wallet_id); END IF;
    IF v_treasury_wallet_id IS NOT NULL THEN v_lock_wallets := array_append(v_lock_wallets, v_treasury_wallet_id); END IF;
    v_lock_wallets := v_lock_wallets || v_comm_wallet_ids;
    
    FOR v_wid IN SELECT DISTINCT UNNEST(v_lock_wallets) AS id ORDER BY id 
    LOOP
        PERFORM * FROM wallets WHERE wallet_id = v_wid FOR UPDATE;
    END LOOP;

    -- 7. Hard Balance Check
    SELECT balance INTO v_before_bal FROM wallets WHERE wallet_id = p_sender_wallet_id;
    IF v_before_bal < v_sender_debit THEN
        RAISE EXCEPTION 'Insufficient balance after lock acquisition. Required: %, Available: %', v_sender_debit, v_before_bal;
    END IF;

    -- 8. Execution Phase
    PERFORM set_config('app.internal_op', 'true', true);

    -- Create Transaction Record
    INSERT INTO transactions (transaction_ref, amount, fee_amount, sender_wallet_id, receiver_wallet_id, type_id, status)
    VALUES (p_transaction_ref, p_amount, v_calculated_fee, p_sender_wallet_id, p_receiver_wallet_id, p_type_id, 'COMPLETED')
    RETURNING transaction_id INTO v_tx_id;
    
    p_transaction_id := v_tx_id;

    -- Update Sender
    UPDATE wallets SET balance = balance - v_sender_debit, last_activity_date = CURRENT_TIMESTAMP
    WHERE wallet_id = p_sender_wallet_id
    RETURNING balance + v_sender_debit, balance INTO v_before_bal, v_after_bal;

    INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
    VALUES (v_tx_id, p_sender_wallet_id, 'DEBIT', v_sender_debit, v_type_name || ': sender', v_before_bal, v_after_bal);

    -- Update Receiver
    UPDATE wallets SET balance = balance + v_receiver_credit, last_activity_date = CURRENT_TIMESTAMP
    WHERE wallet_id = p_receiver_wallet_id
    RETURNING balance - v_receiver_credit, balance INTO v_before_bal, v_after_bal;

    INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
    VALUES (v_tx_id, p_receiver_wallet_id, 'CREDIT', v_receiver_credit, v_type_name || ': receiver', v_before_bal, v_after_bal);

    -- Update Revenue
    IF v_calculated_fee > 0 AND v_revenue_wallet_id IS NOT NULL THEN
        UPDATE wallets SET balance = balance + v_calculated_fee, last_activity_date = CURRENT_TIMESTAMP
        WHERE wallet_id = v_revenue_wallet_id
        RETURNING balance - v_calculated_fee, balance INTO v_before_bal, v_after_bal;

        INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
        VALUES (v_tx_id, v_revenue_wallet_id, 'CREDIT', v_calculated_fee, v_type_name || ': fee to revenue', v_before_bal, v_after_bal);
    END IF;

    -- Treasury Settlement (CASH_OUT)
    IF v_type_name = 'CASH_OUT' AND v_treasury_wallet_id IS NOT NULL THEN
        UPDATE wallets SET balance = balance - p_amount, last_activity_date = CURRENT_TIMESTAMP
        WHERE wallet_id = v_treasury_wallet_id
        RETURNING balance + p_amount, balance INTO v_before_bal, v_after_bal;

        INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
        VALUES (v_tx_id, v_treasury_wallet_id, 'DEBIT', p_amount, v_type_name || ': treasury cash-out settlement', v_before_bal, v_after_bal);
    END IF;

    -- Apply Commissions
    IF array_length(v_comm_wallet_ids, 1) > 0 THEN
        FOR i IN 1 .. array_length(v_comm_wallet_ids, 1) LOOP
            -- From Revenue
            UPDATE wallets SET balance = balance - v_comm_amounts[i] WHERE wallet_id = v_revenue_wallet_id
            RETURNING balance + v_comm_amounts[i], balance INTO v_before_bal, v_after_bal;
            
            INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
            VALUES (v_tx_id, v_revenue_wallet_id, 'DEBIT', v_comm_amounts[i], v_comm_descriptions[i] || ' share out', v_before_bal, v_after_bal);

            -- To Beneficiary
            UPDATE wallets SET balance = balance + v_comm_amounts[i], last_activity_date = CURRENT_TIMESTAMP 
            WHERE wallet_id = v_comm_wallet_ids[i]
            RETURNING balance - v_comm_amounts[i], balance INTO v_before_bal, v_after_bal;
            
            INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
            VALUES (v_tx_id, v_comm_wallet_ids[i], 'CREDIT', v_comm_amounts[i], 'Commission share received', v_before_bal, v_after_bal);
        END LOOP;
    END IF;

    -- Finalize
    UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE transaction_id = v_tx_id;
END;
$$;

