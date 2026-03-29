-- 1. Enhance ledger_entries with balance snapshots
ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS before_balance DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS after_balance  DECIMAL(15,2);

-- 2. Security event log (login, OTP, PIN, account lock)
CREATE TABLE IF NOT EXISTS security_logs (
  id            BIGSERIAL PRIMARY KEY,
  profile_id    BIGINT REFERENCES profiles(profile_id) ON DELETE SET NULL,
  event_type    VARCHAR(50) NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  device_info   JSONB DEFAULT '{}',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Admin action log (wallet loads, reversals, config changes, etc.)
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id                BIGSERIAL PRIMARY KEY,
  admin_id          VARCHAR(100) NOT NULL,
  action            VARCHAR(100) NOT NULL,
  target_profile_id BIGINT REFERENCES profiles(profile_id) ON DELETE SET NULL,
  target_entity     VARCHAR(100),
  amount            DECIMAL(15,2),
  reason            TEXT,
  metadata          JSONB DEFAULT '{}',
  ip_address        INET,
  created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Audit log (human-readable summaries for dashboards/investigations)
CREATE TABLE IF NOT EXISTS audit_logs (
  id                     BIGSERIAL PRIMARY KEY,
  event_type             VARCHAR(50) NOT NULL,
  actor_id               BIGINT,
  actor_type             VARCHAR(20),
  summary                TEXT NOT NULL,
  details                JSONB DEFAULT '{}',
  related_transaction_id BIGINT REFERENCES transactions(transaction_id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


