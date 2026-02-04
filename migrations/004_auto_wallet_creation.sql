CREATE OR REPLACE FUNCTION create_wallet_after_profile_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_type_name TEXT;
BEGIN
    -- Get profile type
    SELECT pt.type_name
    INTO v_type_name
    FROM profile_types pt
    WHERE pt.type_id = NEW.type_id;

    -- Create wallet with conditional max_balance
    IF v_type_name = 'SYSTEM' THEN
        INSERT INTO wallets (profile_id, max_balance)
        VALUES (NEW.profile_id, 1000000000000.00);
    ELSE
        INSERT INTO wallets (profile_id)
        VALUES (NEW.profile_id); -- default max_balance
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_create_wallet_after_profile
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_wallet_after_profile_insert();
