-- 1. Ensure columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE distributor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE merchant_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE biller_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 2. Create the procedure
CREATE OR REPLACE PROCEDURE sp_execute_transaction(
    p_sender_wallet_id BIGINT,
    p_receiver_wallet_id BIGINT,
    p_amount DECIMAL(15,2),
    p_fee_amount DECIMAL(15,2),
    p_type_id INT,
    p_transaction_ref VARCHAR(100),
    INOUT p_transaction_id BIGINT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_type_name VARCHAR(50);
    v_fee_bearer fee_bearer_type;
    v_sender_debit DECIMAL(15,2);
    v_receiver_credit DECIMAL(15,2);
    v_revenue_wallet_id BIGINT;
    v_treasury_wallet_id BIGINT;
    v_before_bal DECIMAL(15,2);
    v_after_bal DECIMAL(15,2);
    v_policy RECORD;
    v_beneficiary_profile_id BIGINT;
    v_beneficiary_wallet_id BIGINT;
    v_share_amount DECIMAL(15,2);
    v_parties RECORD;
    v_lock_wallets BIGINT[];
    v_wid BIGINT;
    v_tx_id BIGINT;
BEGIN
    -- ENABLE INTERNAL OP FLAG (local to this transaction)
    PERFORM set_config('app.internal_op', 'true', true);

    -- Get transaction type details
    SELECT type_name, fee_bearer INTO v_type_name, v_fee_bearer 
    FROM transaction_types WHERE type_id = p_type_id;

    IF v_type_name IS NULL THEN
        RAISE EXCEPTION 'Invalid transaction type ID: %', p_type_id;
    END IF;

    -- Calculate debit/credit based on fee bearer
    IF v_fee_bearer = 'SENDER' THEN
        v_sender_debit := p_amount + p_fee_amount;
        v_receiver_credit := p_amount;
    ELSE -- RECEIVER
        v_sender_debit := p_amount;
        v_receiver_credit := p_amount - p_fee_amount;
    END IF;

    -- Identify auxiliary wallets
    SELECT wallet_id INTO v_revenue_wallet_id FROM wallets WHERE role = 'REVENUE' LIMIT 1;
    SELECT wallet_id INTO v_treasury_wallet_id FROM wallets WHERE role = 'TREASURY' LIMIT 1;

    -- DEADLOCK AVOIDANCE: Lock wallets in consistent ID order
    v_lock_wallets := ARRAY[p_sender_wallet_id, p_receiver_wallet_id];
    IF v_revenue_wallet_id IS NOT NULL THEN v_lock_wallets := array_append(v_lock_wallets, v_revenue_wallet_id); END IF;
    IF v_treasury_wallet_id IS NOT NULL THEN v_lock_wallets := array_append(v_lock_wallets, v_treasury_wallet_id); END IF;
    
    FOR v_wid IN SELECT DISTINCT UNNEST(v_lock_wallets) AS id ORDER BY id LOOP
        PERFORM * FROM wallets WHERE wallet_id = v_wid FOR UPDATE;
    END LOOP;

    -- Check sender balance
    SELECT balance INTO v_before_bal FROM wallets WHERE wallet_id = p_sender_wallet_id;
    IF v_before_bal < v_sender_debit THEN
        RAISE EXCEPTION 'Insufficient balance in sender wallet. Required: %, Available: %', v_sender_debit, v_before_bal;
    END IF;

    -- 1. Create Transaction Record (Initial)
    INSERT INTO transactions (transaction_ref, amount, fee_amount, sender_wallet_id, receiver_wallet_id, type_id, status)
    VALUES (p_transaction_ref, p_amount, p_fee_amount, p_sender_wallet_id, p_receiver_wallet_id, p_type_id, 'COMPLETED')
    RETURNING transaction_id INTO v_tx_id;
    
    p_transaction_id := v_tx_id;

    -- 2. Update Sender Wallet (Debit)
    UPDATE wallets SET balance = balance - v_sender_debit, last_activity_date = CURRENT_TIMESTAMP
    WHERE wallet_id = p_sender_wallet_id
    RETURNING balance + v_sender_debit, balance INTO v_before_bal, v_after_bal;

    INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
    VALUES (v_tx_id, p_sender_wallet_id, 'DEBIT', v_sender_debit, v_type_name || ': sender', v_before_bal, v_after_bal);

    -- 3. Update Receiver Wallet (Credit)
    UPDATE wallets SET balance = balance + v_receiver_credit, last_activity_date = CURRENT_TIMESTAMP
    WHERE wallet_id = p_receiver_wallet_id
    RETURNING balance - v_receiver_credit, balance INTO v_before_bal, v_after_bal;

    INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
    VALUES (v_tx_id, p_receiver_wallet_id, 'CREDIT', v_receiver_credit, v_type_name || ': receiver', v_before_bal, v_after_bal);

    -- 4. Update Revenue Wallet (if fee > 0)
    IF p_fee_amount > 0 AND v_revenue_wallet_id IS NOT NULL THEN
        UPDATE wallets SET balance = balance + p_fee_amount, last_activity_date = CURRENT_TIMESTAMP
        WHERE wallet_id = v_revenue_wallet_id
        RETURNING balance - p_fee_amount, balance INTO v_before_bal, v_after_bal;

        INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
        VALUES (v_tx_id, v_revenue_wallet_id, 'CREDIT', p_fee_amount, v_type_name || ': fee to revenue', v_before_bal, v_after_bal);
    END IF;

    -- 5. Treasury Settlement for CASH_OUT
    IF v_type_name = 'CASH_OUT' AND v_treasury_wallet_id IS NOT NULL THEN
        UPDATE wallets SET balance = balance - p_amount, last_activity_date = CURRENT_TIMESTAMP
        WHERE wallet_id = v_treasury_wallet_id
        RETURNING balance + p_amount, balance INTO v_before_bal, v_after_bal;

        INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
        VALUES (v_tx_id, v_treasury_wallet_id, 'DEBIT', p_amount, v_type_name || ': treasury cash-out settlement', v_before_bal, v_after_bal);
    END IF;

    -- 6. Commission Distribution
    SELECT p1.profile_id as s_pid, p1.type_id as s_tid, p2.profile_id as r_pid, p2.type_id as r_tid
    INTO v_parties
    FROM wallets w1 
    JOIN profiles p1 ON w1.profile_id = p1.profile_id
    JOIN wallets w2 ON w2.wallet_id = p_receiver_wallet_id
    JOIN profiles p2 ON w2.profile_id = p2.profile_id
    WHERE w1.wallet_id = p_sender_wallet_id;

    FOR v_policy IN SELECT cp.*, pt.type_name as beneficiary_type_name 
                    FROM commission_policies cp
                    JOIN profile_types pt ON cp.profile_type_id = pt.type_id
                    WHERE cp.transaction_type_id = p_type_id LOOP
        v_beneficiary_profile_id := NULL;
        IF v_policy.profile_type_id = v_parties.s_tid THEN
            v_beneficiary_profile_id := v_parties.s_pid;
        ELSIF v_policy.profile_type_id = v_parties.r_tid THEN
            v_beneficiary_profile_id := v_parties.r_pid;
        ELSIF v_policy.beneficiary_type_name = 'DISTRIBUTOR' THEN
            IF v_parties.s_tid = 2 THEN 
                SELECT distributor_id INTO v_beneficiary_profile_id FROM agent_profiles WHERE profile_id = v_parties.s_pid;
            ELSIF v_parties.r_tid = 2 THEN 
                SELECT distributor_id INTO v_beneficiary_profile_id FROM agent_profiles WHERE profile_id = v_parties.r_pid;
            END IF;
        END IF;

        IF v_beneficiary_profile_id IS NOT NULL THEN
            v_share_amount := ROUND((p_amount * v_policy.commission_share / 100), 2);
            IF v_share_amount > 0 AND v_revenue_wallet_id IS NOT NULL THEN
                SELECT wallet_id INTO v_beneficiary_wallet_id FROM wallets WHERE profile_id = v_beneficiary_profile_id;
                IF v_beneficiary_wallet_id IS NOT NULL THEN
                    UPDATE wallets SET balance = balance - v_share_amount WHERE wallet_id = v_revenue_wallet_id
                    RETURNING balance + v_share_amount, balance INTO v_before_bal, v_after_bal;
                    INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
                    VALUES (v_tx_id, v_revenue_wallet_id, 'DEBIT', v_share_amount, 'Commission share (' || v_policy.commission_share || '% to ' || v_policy.beneficiary_type_name || ')', v_before_bal, v_after_bal);

                    UPDATE wallets SET balance = balance + v_share_amount, last_activity_date = CURRENT_TIMESTAMP 
                    WHERE wallet_id = v_beneficiary_wallet_id
                    RETURNING balance - v_share_amount, balance INTO v_before_bal, v_after_bal;
                    INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
                    VALUES (v_tx_id, v_beneficiary_wallet_id, 'CREDIT', v_share_amount, 'Commission share received', v_before_bal, v_after_bal);
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- Update transaction record
    UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE transaction_id = v_tx_id;
    
    -- DISABLE INTERNAL OP FLAG (Removed explicit false reset; local true handles this automatically at end of tx)
    -- PERFORM set_config('app.internal_op', 'false', true);
END;
$$;
