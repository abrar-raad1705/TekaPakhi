-- Test Admin Creation Flow
BEGIN;

-- 1. Create Profile (with trigger that creates wallet)
INSERT INTO teka.profiles (phone_number, full_name, security_pin_hash, type_id)
VALUES ('01777777777', 'Full Test Biller', 'hash', 5)
RETURNING profile_id;

-- 2. Create Biller Subtype
INSERT INTO teka.biller_profiles (profile_id, service_name, biller_type, status)
VALUES (
    (SELECT profile_id FROM teka.profiles WHERE phone_number='01777777777'), 
    'Full Test Service', 
    'Electricity', 
    'ACTIVE'
);

-- 3. Check result
SELECT p.profile_id, p.full_name, w.wallet_id, w.balance, b.service_name
FROM teka.profiles p
JOIN teka.wallets w ON p.profile_id = w.profile_id
JOIN teka.biller_profiles b ON p.profile_id = b.profile_id
WHERE p.phone_number = '01777777777';

ROLLBACK; -- Don't leave junk
