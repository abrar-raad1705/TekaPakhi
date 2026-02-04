-- Add profile type id to profiles
ALTER TABLE profiles
ADD COLUMN type_id INTEGER NOT NULL REFERENCES profile_types(type_id);

-- Add not null constraint to sender & reciever wallet id
ALTER TABLE transactions
ALTER COLUMN sender_wallet_id SET NOT NULL,
ALTER COLUMN receiver_wallet_id SET NOT NULL;

-- Add min and max fee boundaries
ALTER TABLE transaction_types
ADD COLUMN fee_min_amount DECIMAL(10, 2),
ADD COLUMN fee_max_amount DECIMAL(10, 2);

ALTER TABLE transaction_types
ADD CONSTRAINT chk_fee_min_max
CHECK (
    fee_min_amount IS NULL
    OR fee_max_amount IS NULL
    OR fee_min_amount <= fee_max_amount
);
