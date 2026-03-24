CREATE OR REPLACE FUNCTION tp.create_wallet_after_profile_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_max_balance DECIMAL(15,2);
BEGIN
    -- Fetch max balance from profile_types
    SELECT default_max_balance
    INTO v_max_balance
    FROM tp.profile_types
    WHERE type_id = NEW.type_id;

    -- Create wallet
    INSERT INTO tp.wallets (profile_id, balance, max_balance)
    VALUES (
        NEW.profile_id,
        0.00,
        v_max_balance
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_wallet_after_profile
AFTER INSERT ON tp.profiles
FOR EACH ROW
EXECUTE FUNCTION tp.create_wallet_after_profile_insert();