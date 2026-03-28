ALTER TABLE teka.merchant_profiles
  DROP COLUMN IF EXISTS business_type;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'teka'
    AND table_name = 'merchant_profiles' 
    AND column_name = 'business_name'
  ) THEN
    ALTER TABLE teka.merchant_profiles 
      RENAME COLUMN business_name TO shop_name;
  END IF;
END $$;

ALTER TABLE teka.merchant_profiles
  ADD COLUMN IF NOT EXISTS shop_address TEXT;

ALTER TABLE teka.merchant_profiles
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS area VARCHAR(100);

ALTER TABLE teka.agent_profiles
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS area VARCHAR(100),
  ADD COLUMN IF NOT EXISTS distributor_id BIGINT
    REFERENCES teka.distributor_profiles(profile_id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_profiles_distributor 
  ON teka.agent_profiles(distributor_id);
