-- Mimic backend profile creation logic
BEGIN;

-- 1. Profile creation (Trigger will run)
INSERT INTO teka.profiles (phone_number, full_name, security_pin_hash, type_id, email)
VALUES ('01766666666', 'Repro Test', 'hash', 4, 'repro@test.com')
RETURNING profile_id;

-- 2. Distributor Profile creation (INCLUDING created_at)
INSERT INTO teka.distributor_profiles (profile_id, business_name, additional_info, status, created_at, pending_pin_setup)
VALUES (
    (SELECT profile_id FROM teka.profiles WHERE phone_number='01766666666'),
    'Repro Business',
    'Info',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    TRUE
);

-- 3. Check wallet existence
SELECT * FROM teka.wallets WHERE profile_id = (SELECT profile_id FROM teka.profiles WHERE phone_number='01766666666');

ROLLBACK;
