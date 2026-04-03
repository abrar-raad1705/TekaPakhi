-- 1. Enhance ledger_entries with balance snapshots
ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS before_balance DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS after_balance  DECIMAL(15,2);

-- 2. Audit log (human-readable summaries for dashboards/investigations)
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