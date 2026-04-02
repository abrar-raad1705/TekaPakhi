ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status profile_status;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS b2b_suspended BOOLEAN DEFAULT FALSE;

UPDATE profiles SET account_status = 'ACTIVE' WHERE account_status IS NULL;

ALTER TABLE profiles ALTER COLUMN account_status SET NOT NULL;
