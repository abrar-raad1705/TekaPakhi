INSERT INTO profiles (
    phone_number,
    full_name,
    email,
    security_pin_hash,
    is_phone_verified,
    registration_date,
    type_id
)
VALUES (
    '01999999999',
    'Platform Revenue',
    'admin@tekapakhi.com',
    'hashed_super_secret_pin',
    TRUE,
    CURRENT_TIMESTAMP,
    (SELECT type_id FROM profile_types WHERE type_name = 'SYSTEM')
);
