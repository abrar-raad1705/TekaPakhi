-- create schema
DROP SCHEMA IF EXISTS tp CASCADE;
CREATE SCHEMA IF NOT EXISTS tp;

-- set search path
SET search_path TO tp;

-- run other files
\i 001_init.sql
\i 002_profile_type_creation.sql
\i 003_auto_wallet_creation.sql
\i 004_seed_business_data.sql
\i 005_system_wallet_creation.sql
\i 006_locations.sql
\i 007_distributor_profiles_location.sql
\i 008_distributor_areas.sql
\i 009_update_commission_policies.sql