-- 014: Transaction Functions (Fee Calculation & Limit Checking)

-- 1. Function to Calculate Transaction Fee
CREATE OR REPLACE FUNCTION teka.fn_calculate_transaction_fee(
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
    FROM teka.transaction_types
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
        FROM teka.transactions
        WHERE sender_wallet_id IN (SELECT wallet_id FROM teka.wallets WHERE profile_id = p_sender_profile_id)
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
        FROM teka.biller_profiles
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

-- 2. Function to Check Transaction Limits
CREATE OR REPLACE FUNCTION teka.fn_check_transaction_limits(
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
    SELECT type_id INTO v_profile_type_id FROM teka.profiles WHERE profile_id = p_sender_profile_id;

    -- Fetch limits
    SELECT * INTO v_limits 
    FROM teka.transaction_limits 
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
    FROM teka.transactions
    WHERE sender_wallet_id IN (SELECT wallet_id FROM teka.wallets WHERE profile_id = p_sender_profile_id)
      AND type_id = p_type_id
      AND status = 'COMPLETED'
      AND transaction_time >= DATE_TRUNC('day', CURRENT_TIMESTAMP);

    SELECT 
        COUNT(*), 
        COALESCE(SUM(amount), 0)
    INTO v_monthly_count, v_monthly_total
    FROM teka.transactions
    WHERE sender_wallet_id IN (SELECT wallet_id FROM teka.wallets WHERE profile_id = p_sender_profile_id)
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
