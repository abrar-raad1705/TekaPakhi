ALTER TABLE commission_policies ALTER COLUMN commission_share TYPE numeric(10,4);

UPDATE commission_policies 
SET commission_share = 0.4000 
WHERE transaction_type_id = 2 AND profile_type_id = 2;

UPDATE commission_policies 
SET commission_share = 0.1000 
WHERE transaction_type_id = 2 AND profile_type_id = 4;

INSERT INTO commission_policies (profile_type_id, transaction_type_id, commission_share) 
VALUES (2, 1, 0.3750)
ON CONFLICT (profile_type_id, transaction_type_id) DO UPDATE SET commission_share = EXCLUDED.commission_share;

INSERT INTO commission_policies (profile_type_id, transaction_type_id, commission_share) 
VALUES (4, 1, 0.1250)
ON CONFLICT (profile_type_id, transaction_type_id) DO UPDATE SET commission_share = EXCLUDED.commission_share;
