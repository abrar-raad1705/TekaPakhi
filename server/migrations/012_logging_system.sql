-- 012: Logging & Audit System
-- Adds balance snapshots to ledger_entries and creates security_logs,
-- admin_action_logs, and audit_logs tables.

-- 1. Enhance ledger_entries with balance snapshots
ALTER TABLE tp.ledger_entries
  ADD COLUMN IF NOT EXISTS before_balance DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS after_balance  DECIMAL(15,2);

-- 2. Security event log (login, OTP, PIN, account lock)
CREATE TABLE IF NOT EXISTS tp.security_logs (
  id            BIGSERIAL PRIMARY KEY,
  profile_id    BIGINT REFERENCES tp.profiles(profile_id) ON DELETE SET NULL,
  event_type    VARCHAR(50) NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  device_info   JSONB DEFAULT '{}',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_logs_profile ON tp.security_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event   ON tp.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_time    ON tp.security_logs(created_at);

-- 3. Admin action log (wallet loads, reversals, config changes, etc.)
CREATE TABLE IF NOT EXISTS tp.admin_action_logs (
  id                BIGSERIAL PRIMARY KEY,
  admin_id          VARCHAR(100) NOT NULL,
  action            VARCHAR(100) NOT NULL,
  target_profile_id BIGINT REFERENCES tp.profiles(profile_id) ON DELETE SET NULL,
  target_entity     VARCHAR(100),
  amount            DECIMAL(15,2),
  reason            TEXT,
  metadata          JSONB DEFAULT '{}',
  ip_address        INET,
  created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin  ON tp.admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON tp.admin_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time   ON tp.admin_action_logs(created_at);

-- 4. Audit log (human-readable summaries for dashboards/investigations)
CREATE TABLE IF NOT EXISTS tp.audit_logs (
  id                     BIGSERIAL PRIMARY KEY,
  event_type             VARCHAR(50) NOT NULL,
  actor_id               BIGINT,
  actor_type             VARCHAR(20),
  summary                TEXT NOT NULL,
  details                JSONB DEFAULT '{}',
  related_transaction_id BIGINT REFERENCES tp.transactions(transaction_id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_event ON tp.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_time  ON tp.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON tp.audit_logs(actor_id);
