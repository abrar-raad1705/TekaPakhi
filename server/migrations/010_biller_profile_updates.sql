-- 1. Create biller_type ENUM
DO $$ BEGIN
  CREATE TYPE biller_type AS ENUM (
    'Electricity','Gas','Water','Internet','Telephone',
    'TV','Credit Card','Govt. Fees','Insurance','Tracker','Others'
  );
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add new columns to biller_profiles
ALTER TABLE biller_profiles
  ADD COLUMN IF NOT EXISTS biller_type biller_type NOT NULL DEFAULT 'Others',
  ADD COLUMN IF NOT EXISTS sender_charge_flat DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sender_charge_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pending_pin_setup BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Update existing biller_profiles
ALTER TABLE biller_profiles 
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS biller_code;

-- 4. Create bill_payment_details table
CREATE TABLE bill_payment_details (
    transaction_id BIGINT PRIMARY KEY REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    bill_account_number VARCHAR(50) NOT NULL,
    bill_contact_number VARCHAR(15) NOT NULL
);
