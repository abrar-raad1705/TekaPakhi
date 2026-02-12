CREATE OR REPLACE FUNCTION "tp"."create_wallet_after_profile_insert"()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "tp"."wallets" ("profile_id", "balance", "max_balance")
    VALUES (
        NEW.profile_id, 
        0.00, 
        CASE 
            WHEN NEW.type_id = 1 THEN 500000.00        -- CUSTOMER
            WHEN NEW.type_id = 2 THEN 2000000.00       -- AGENT
            WHEN NEW.type_id = 3 THEN 999999999.00     -- MERCHANT
            WHEN NEW.type_id = 4 THEN 500000000.00     -- DISTRIBUTOR
            WHEN NEW.type_id = 6 THEN 1000000000000.00 -- SYSTEM
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;