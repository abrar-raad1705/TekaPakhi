CREATE OR REPLACE FUNCTION teka.create_wallet_after_profile_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_max_balance DECIMAL(15,2);
BEGIN
    -- ENABLE INTERNAL OP FLAG (local to this transaction)
    -- This allows the system to create a wallet even though the profiles table 
    -- was updated from an "outside" source (the backend).
    PERFORM set_config('teka.internal_op', 'true', true);

    -- Fetch max balance from teka.profile_types
    SELECT default_max_balance
    INTO v_max_balance
    FROM teka.profile_types
    WHERE type_id = NEW.type_id;

    -- Create wallet in teka.wallets
    INSERT INTO teka.wallets (profile_id, balance, max_balance)
    VALUES (
        NEW.profile_id,
        0.00,
        v_max_balance
    );

    -- Reset flag (local true ensures it resets anyway, but good for clarity)
    PERFORM set_config('teka.internal_op', 'false', true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_wallet_after_profile ON teka.profiles;
CREATE TRIGGER trg_create_wallet_after_profile
AFTER INSERT ON teka.profiles
FOR EACH ROW
EXECUTE FUNCTION teka.create_wallet_after_profile_insert();