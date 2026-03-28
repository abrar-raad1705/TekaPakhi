-- create schema
DROP SCHEMA IF EXISTS teka CASCADE;
CREATE SCHEMA IF NOT EXISTS teka;

-- set search_path
SET search_path TO teka;

-- run other files
\i 001_init.sql
\i 002_profile_type_creation.sql
\i 003_auto_wallet_creation.sql
\i 004_seed_business_data.sql
\i 005_system_wallet_creation.sql
\i 006_locations.sql
\i 007_distributor_profiles_location.sql
\i 008_agent_merchant_profile_updates.sql
\i 009_update_commission_policies.sql
\i 010_biller_profile_updates.sql
\i 011_pin_reset_grant.sql
\i 012_logging_system.sql
\i 013_transaction_procedure.sql
\i 014_transaction_functions.sql
\i 015_privacy_and_integrity_triggers.sql