-- 1. to Calculate Transaction Fee
CREATE OR REPLACE FUNCTION fn_calculate_transaction_fee(
    p_type_id INT,
    p_amount DECIMAL,
    p_sender_profile_id BIGINT DEFAULT NULL,
    p_receiver_profile_id BIGINT DEFAULT NULL
)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_type_name VARCHAR(50);
    v_pct DECIMAL(5, 2);
    v_flat DECIMAL(10, 2);
    v_min_fee DECIMAL(10, 2);
    v_max_fee DECIMAL(10, 2);
    v_fee DECIMAL(10, 2);
    v_monthly_total DECIMAL(15, 2);
BEGIN
    -- Fetch standard config
    SELECT type_name, fee_percentage, fee_flat_amount, fee_min_amount, fee_max_amount
    INTO v_type_name, v_pct, v_flat, v_min_fee, v_max_fee
    FROM transaction_types
    WHERE type_id = p_type_id;

    IF v_type_name IS NULL THEN
        RAISE EXCEPTION 'Invalid transaction type ID: %', p_type_id;
    END IF;

    -- Special Logic for SEND_MONEY (Tiered Fee)
    IF v_type_name = 'SEND_MONEY' AND p_sender_profile_id IS NOT NULL THEN
        -- Rule 1: Up to BDT 50 is free
        IF p_amount <= 50 THEN
            RETURN 0.00;
        END IF;

        -- Fetch monthly total
        SELECT COALESCE(SUM(amount), 0)
        INTO v_monthly_total
        FROM transactions
        WHERE sender_wallet_id IN (SELECT wallet_id FROM wallets WHERE profile_id = p_sender_profile_id)
          AND type_id = p_type_id
          AND status = 'COMPLETED'
          AND transaction_time >= DATE_TRUNC('month', CURRENT_TIMESTAMP);

        -- Rule 2: Cumulative total within 25,000 -> 5 BDT
        IF (v_monthly_total + p_amount) <= 25000 THEN
            RETURN 5.00;
        ELSE
            -- Rule 3: Exceeds 25,000 -> 10 BDT
            RETURN 10.00;
        END IF;
    END IF;

    -- Special Logic for PAY_BILL (Biller-specific)
    IF v_type_name = 'PAY_BILL' AND p_receiver_profile_id IS NOT NULL THEN
        SELECT sender_charge_flat, sender_charge_percent
        INTO v_flat, v_pct
        FROM biller_profiles
        WHERE profile_id = p_receiver_profile_id;
        
        IF v_flat IS NULL THEN v_flat := 0; END IF;
        IF v_pct IS NULL THEN v_pct := 0; END IF;
    END IF;

    -- Standard Calculation
    v_fee := (p_amount * v_pct / 100) + v_flat;

    -- Clamp
    IF v_min_fee IS NOT NULL AND v_fee < v_min_fee THEN v_fee := v_min_fee; END IF;
    IF v_max_fee IS NOT NULL AND v_fee > v_max_fee THEN v_fee := v_max_fee; END IF;

    RETURN ROUND(v_fee, 2);
END;
$$;

-- 2. to Check Transaction Limits
CREATE OR REPLACE FUNCTION fn_check_transaction_limits(
    p_sender_profile_id BIGINT,
    p_type_id INT,
    p_amount DECIMAL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile_type_id INT;
    v_limits RECORD;
    v_daily_count INT;
    v_daily_total DECIMAL(15, 2);
    v_monthly_count INT;
    v_monthly_total DECIMAL(15, 2);
BEGIN
    -- Get sender profile type
    SELECT type_id INTO v_profile_type_id FROM profiles WHERE profile_id = p_sender_profile_id;

    -- Fetch limits
    SELECT * INTO v_limits 
    FROM transaction_limits 
    WHERE profile_type_id = v_profile_type_id AND transaction_type_id = p_type_id;

    IF v_limits IS NULL THEN
        RETURN NULL; -- No limits configured
    END IF;

    -- 1. Per-transaction limits
    IF v_limits.min_per_transaction IS NOT NULL AND p_amount < v_limits.min_per_transaction THEN
        RETURN 'Minimum transaction amount is ৳' || v_limits.min_per_transaction::TEXT;
    END IF;
    IF v_limits.max_per_transaction IS NOT NULL AND p_amount > v_limits.max_per_transaction THEN
        RETURN 'Maximum transaction amount is ৳' || v_limits.max_per_transaction::TEXT;
    END IF;

    -- 2. Fetch current usage
    SELECT 
        COUNT(*), 
        COALESCE(SUM(amount), 0)
    INTO v_daily_count, v_daily_total
    FROM transactions
    WHERE sender_wallet_id IN (SELECT wallet_id FROM wallets WHERE profile_id = p_sender_profile_id)
      AND type_id = p_type_id
      AND status = 'COMPLETED'
      AND transaction_time >= DATE_TRUNC('day', CURRENT_TIMESTAMP);

    SELECT 
        COUNT(*), 
        COALESCE(SUM(amount), 0)
    INTO v_monthly_count, v_monthly_total
    FROM transactions
    WHERE sender_wallet_id IN (SELECT wallet_id FROM wallets WHERE profile_id = p_sender_profile_id)
      AND type_id = p_type_id
      AND status = 'COMPLETED'
      AND transaction_time >= DATE_TRUNC('month', CURRENT_TIMESTAMP);

    -- 3. Check daily limits
    IF v_limits.max_count_daily IS NOT NULL AND v_daily_count >= v_limits.max_count_daily THEN
        RETURN 'Daily transaction count limit reached (' || v_limits.max_count_daily || ')';
    END IF;
    IF v_limits.daily_limit IS NOT NULL AND (v_daily_total + p_amount) > v_limits.daily_limit THEN
        RETURN 'Daily amount limit exceeded. Remaining: ৳' || (v_limits.daily_limit - v_daily_total)::TEXT;
    END IF;

    -- 4. Check monthly limits
    IF v_limits.max_count_monthly IS NOT NULL AND v_monthly_count >= v_limits.max_count_monthly THEN
        RETURN 'Monthly transaction count limit reached (' || v_limits.max_count_monthly || ')';
    END IF;
    IF v_limits.monthly_limit IS NOT NULL AND (v_monthly_total + p_amount) > v_limits.monthly_limit THEN
        RETURN 'Monthly amount limit exceeded. Remaining: ৳' || (v_limits.monthly_limit - v_monthly_total)::TEXT;
    END IF;

    RETURN NULL; -- ALL OK
END;
$$;

-- 2.5 to Validate Transaction Preflight
CREATE OR REPLACE FUNCTION fn_validate_transaction_preflight(
    p_sender_profile_id BIGINT,
    p_receiver_profile_id BIGINT,
    p_type_id INT,
    p_amount DECIMAL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_type_name VARCHAR(50);
    v_sender_type_id INT;
    v_sender_status TEXT;
    v_receiver_type_id INT;
    v_receiver_status TEXT;
    v_limit_error TEXT;
BEGIN
    -- 1. Identity & Existence
    IF p_sender_profile_id = p_receiver_profile_id THEN
        RETURN 'You cannot send money to yourself.';
    END IF;

    -- Resolve profiles
    SELECT type_id, account_status::text INTO v_sender_type_id, v_sender_status
    FROM profiles WHERE profile_id = p_sender_profile_id;
    
    SELECT type_id, account_status::text INTO v_receiver_type_id, v_receiver_status
    FROM profiles WHERE profile_id = p_receiver_profile_id;

    IF v_sender_status IS NULL THEN RETURN 'Sender profile not found.'; END IF;
    IF v_receiver_status IS NULL THEN RETURN 'Receiver profile not found.'; END IF;

    -- 2. Status Validation
    IF v_sender_status != 'ACTIVE' THEN
        RETURN 'Your account is ' || v_sender_status || '. Transactions are prohibited.';
    END IF;
    IF v_receiver_status != 'ACTIVE' THEN
        RETURN 'Recipient account is ' || v_receiver_status || '. Transactions are prohibited.';
    END IF;

    -- 3. Role Validation
    SELECT type_name INTO v_type_name FROM transaction_types WHERE type_id = p_type_id;

    IF v_type_name = 'SEND_MONEY' THEN
        IF NOT (v_sender_type_id IN (1, 3) AND v_receiver_type_id = 1) THEN
            RETURN 'Account type incompatible for Send Money.';
        END IF;
    ELSIF v_type_name = 'CASH_IN' THEN
        IF NOT (v_sender_type_id = 2 AND v_receiver_type_id = 1) THEN
            RETURN 'Only Agents can perform Cash In to Customers.';
        END IF;
    ELSIF v_type_name = 'CASH_OUT' THEN
        -- Standard: Customer (1) or Merchant (3) to Agent (2)
        -- ADDED: Biller (5) to Agent (2)
        IF NOT (v_sender_type_id IN (1, 3, 5) AND v_receiver_type_id = 2) THEN
            RETURN 'Account type incompatible for Cash Out.';
        END IF;
    ELSIF v_type_name = 'PAYMENT' THEN
        IF NOT (v_sender_type_id IN (1, 3) AND v_receiver_type_id = 3) THEN
            RETURN 'Account type incompatible for Payment.';
        END IF;
    ELSIF v_type_name = 'PAY_BILL' THEN
         IF v_receiver_type_id != 5 THEN
            RETURN 'Recipient must be a valid Biller for Pay Bill.';
        END IF;
    ELSIF v_type_name = 'B2B' THEN
        IF NOT (v_sender_type_id IN (4, 2) AND v_receiver_type_id IN (2, 4)) THEN
            RETURN 'Account type incompatible for B2B.';
        END IF;
        
        -- Connection check
        IF v_sender_type_id = 4 AND v_receiver_type_id = 2 THEN -- DISTRIBUTOR to AGENT
            IF NOT EXISTS (SELECT 1 FROM agent_profiles WHERE profile_id = p_receiver_profile_id AND distributor_id = p_sender_profile_id) THEN
                RETURN 'You can only transfer float to agents connected to your distributor account.';
            END IF;
        ELSIF v_sender_type_id = 2 AND v_receiver_type_id = 4 THEN -- AGENT to DISTRIBUTOR
            IF NOT EXISTS (SELECT 1 FROM agent_profiles WHERE profile_id = p_sender_profile_id AND distributor_id = p_receiver_profile_id) THEN
                RETURN 'You can only transfer float to your connected distributor.';
            END IF;
        END IF;
    END IF;

    -- 4. Limit Validation
    v_limit_error := fn_check_transaction_limits(p_sender_profile_id, p_type_id, p_amount);
    IF v_limit_error IS NOT NULL THEN
        RETURN v_limit_error;
    END IF;

    RETURN NULL; -- ALL OK
END;
$$;

-- 3. Security enforcement function
CREATE OR REPLACE FUNCTION fn_enforce_internal_only()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the internal operation flag is set to 'true'
    IF current_setting('app.internal_op', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Data Privacy Violation: Direct modification of financial records is prohibited. Use authorized procedures.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Transaction immutability guard
CREATE OR REPLACE FUNCTION fn_transaction_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.transaction_ref IS DISTINCT FROM NEW.transaction_ref THEN
        RAISE EXCEPTION 'Cannot modify transaction_ref after creation.';
    END IF;
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
        RAISE EXCEPTION 'Cannot modify transaction amount after creation.';
    END IF;
    IF OLD.fee_amount IS DISTINCT FROM NEW.fee_amount THEN
        RAISE EXCEPTION 'Cannot modify fee_amount after creation.';
    END IF;
    IF OLD.sender_wallet_id IS DISTINCT FROM NEW.sender_wallet_id THEN
        RAISE EXCEPTION 'Cannot modify sender_wallet_id after creation.';
    END IF;
    IF OLD.receiver_wallet_id IS DISTINCT FROM NEW.receiver_wallet_id THEN
        RAISE EXCEPTION 'Cannot modify receiver_wallet_id after creation.';
    END IF;
    IF OLD.type_id IS DISTINCT FROM NEW.type_id THEN
        RAISE EXCEPTION 'Cannot modify type_id after creation.';
    END IF;
    IF OLD.transaction_time IS DISTINCT FROM NEW.transaction_time THEN
        RAISE EXCEPTION 'Cannot modify transaction_time after creation.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Transaction status transition enforcement
CREATE OR REPLACE FUNCTION fn_enforce_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW; -- no-op, allow
    END IF;

    IF OLD.status = 'PENDING' AND NEW.status IN ('COMPLETED', 'FAILED') THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'COMPLETED' AND NEW.status = 'REVERSED' THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

-- 6. Ledger immutability 
CREATE OR REPLACE FUNCTION fn_ledger_no_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable. Updates are not allowed.';
END;
$$ LANGUAGE plpgsql;

-- 7. Wallet balance defense-in-depth 
CREATE OR REPLACE FUNCTION fn_wallet_no_negative()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow REVENUE wallet to go negative, prevent for others
    IF NEW.balance < 0 AND NEW.role IS DISTINCT FROM 'REVENUE' THEN
        RAISE EXCEPTION 'Wallet % balance cannot go negative. Attempted balance: %',
            NEW.wallet_id, NEW.balance;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Max balance enforcement on credits
CREATE OR REPLACE FUNCTION fn_wallet_max_balance_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip for system wallets (TREASURY, REVENUE, ADJUSTMENT)
    IF NEW.role IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.balance > NEW.max_balance THEN
        RAISE EXCEPTION 'Wallet % would exceed maximum balance. Balance: %, Max: %',
            NEW.wallet_id, NEW.balance, NEW.max_balance;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. OTP auto-expire 
CREATE OR REPLACE FUNCTION fn_otp_auto_expire()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE otp_codes
    SET is_used = TRUE
    WHERE phone_number = NEW.phone_number
      AND purpose = NEW.purpose
      AND is_used = FALSE
      AND otp_id != NEW.otp_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Auto-update updated_at timestamp 
CREATE OR REPLACE FUNCTION fn_auto_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Block wallet operations for inactive profiles (BLOCKED / SUSPENDED)
CREATE OR REPLACE FUNCTION fn_block_wallet_on_inactive_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    -- Skip system wallets (TREASURY, REVENUE, ADJUSTMENT)
    IF NEW.role IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Only check when balance is actually changing
    IF TG_OP = 'UPDATE' AND OLD.balance IS NOT DISTINCT FROM NEW.balance THEN
        RETURN NEW;
    END IF;

    SELECT account_status::text INTO v_status
    FROM profiles
    WHERE profile_id = NEW.profile_id;

    IF v_status IN ('BLOCKED', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Wallet operation denied: account is %. No transactions are allowed on this account.',
            v_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Enforce B2B minimum amount
CREATE OR REPLACE FUNCTION fn_enforce_b2b_min_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_type_name VARCHAR(50);
BEGIN
    SELECT type_name INTO v_type_name FROM transaction_types WHERE type_id = NEW.type_id;
    
    IF v_type_name = 'B2B' AND NEW.amount < 5000 THEN
        RAISE EXCEPTION 'B2B transfer amount must be at least ৳5000.00';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
