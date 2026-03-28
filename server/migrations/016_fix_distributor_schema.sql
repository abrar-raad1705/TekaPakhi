-- Add missing created_at column to distributor_profiles
-- This was requested by the backend profileModel.js for distributor creation.

ALTER TABLE teka.distributor_profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
