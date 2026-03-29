-- Profile & Auth Indexes
CREATE INDEX IF NOT EXISTS idx_profile_phone ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_wallet_role ON wallets(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallets_profile ON wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose ON otp_codes(phone_number, purpose);

-- Transaction & Ledger Indexes
CREATE INDEX IF NOT EXISTS idx_txn_sender ON transactions(sender_wallet_id);
CREATE INDEX IF NOT EXISTS idx_txn_receiver ON transactions(receiver_wallet_id);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_txn_type   ON transactions(type_id);
CREATE INDEX IF NOT EXISTS idx_txn_time   ON transactions(transaction_time);
CREATE INDEX IF NOT EXISTS idx_txn_sender_type_status_time ON transactions(sender_wallet_id, type_id, status, transaction_time);

CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_type ON ledger_entries(wallet_id, entry_type);

-- Location & Specialized Profile Indexes
CREATE INDEX IF NOT EXISTS idx_locations_district ON locations(district);
CREATE INDEX IF NOT EXISTS idx_locations_area ON locations(area);
CREATE INDEX IF NOT EXISTS idx_distributor_areas_profile ON distributor_areas(profile_id);
CREATE INDEX IF NOT EXISTS idx_distributor_areas_district ON distributor_areas(district);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_distributor ON agent_profiles(distributor_id);

-- Logging & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_security_logs_profile ON security_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event   ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_time    ON security_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin  ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time   ON admin_action_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_time  ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
