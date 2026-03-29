-- 1. Distributor profile updates
ALTER TABLE distributor_profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS business_name VARCHAR(100) NOT NULL,
  ADD COLUMN IF NOT EXISTS additional_info TEXT,
  ADD COLUMN IF NOT EXISTS pending_pin_setup BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Distributor areas table (final design)
CREATE TABLE IF NOT EXISTS distributor_areas (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL
    REFERENCES distributor_profiles(profile_id)
    ON DELETE CASCADE,
  district VARCHAR(100) NOT NULL,
  area VARCHAR(100) NOT NULL,
  UNIQUE (district, area)
);



-- 4. Drop old stuff (only if exists)
ALTER TABLE distributor_profiles DROP COLUMN IF EXISTS region;
ALTER TABLE distributor_profiles DROP COLUMN IF EXISTS district;
ALTER TABLE distributor_profiles DROP COLUMN IF EXISTS area;
ALTER TABLE distributor_profiles DROP COLUMN IF EXISTS approved_date;

DROP INDEX IF EXISTS idx_distributor_unique_area;