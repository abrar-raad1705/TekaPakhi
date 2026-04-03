-- Drop security_logs and admin_action_logs tables (redundant with audit_logs)

-- Drop indexes first
DROP INDEX IF EXISTS idx_security_logs_profile;
DROP INDEX IF EXISTS idx_security_logs_event;
DROP INDEX IF EXISTS idx_security_logs_time;

DROP INDEX IF EXISTS idx_admin_logs_admin;
DROP INDEX IF EXISTS idx_admin_logs_action;
DROP INDEX IF EXISTS idx_admin_logs_time;

-- Drop tables
DROP TABLE IF EXISTS security_logs;
DROP TABLE IF EXISTS admin_action_logs;
