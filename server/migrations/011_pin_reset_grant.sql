-- One-time Forgot PIN: admin sets pin_reset_granted; cleared after successful reset (agents, distributors, billers).

ALTER TABLE tp.profiles
  ADD COLUMN IF NOT EXISTS pin_reset_granted BOOLEAN NOT NULL DEFAULT FALSE;
