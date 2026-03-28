INSERT INTO teka.profiles (
    phone_number,
    full_name,
    email,
    security_pin_hash,
    is_phone_verified,
    type_id,
    is_internal
)
VALUES
('01900000000', 'TREASURY', 'treasury@system.internal', 'NO_LOGIN', TRUE, 6, TRUE),
('01900000001', 'REVENUE', 'revenue@system.internal', 'NO_LOGIN', TRUE, 6, TRUE),
('01900000002', 'ADJUSTMENT', 'adjustment@system.internal', 'NO_LOGIN', TRUE, 6, TRUE);

-- Assign roles to the system wallets: 'TREASURY', 'REVENUE', 'ADJUSTMENT'
UPDATE teka.wallets w
SET role = 'TREASURY'
FROM teka.profiles p
WHERE w.profile_id = p.profile_id
AND p.full_name = 'TREASURY';

UPDATE teka.wallets w
SET role = 'REVENUE'
FROM teka.profiles p
WHERE w.profile_id = p.profile_id
AND p.full_name = 'REVENUE';

UPDATE teka.wallets w
SET role = 'ADJUSTMENT'
FROM teka.profiles p
WHERE w.profile_id = p.profile_id
AND p.full_name = 'ADJUSTMENT';