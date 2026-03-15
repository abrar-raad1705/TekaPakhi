-- 1. Setup Transaction Types
-- Note: 'SEND_MONEY' fee logic is tiered (0, 5, 10 BDT) and need to be handled in app logic.
INSERT INTO "tp"."transaction_types" ("type_id", "type_name", "fee_percentage", "fee_flat_amount", "fee_bearer", "fee_min_amount", "fee_max_amount") VALUES
(1, 'CASH_IN', 0.00, 0.00, 'RECEIVER', NULL, NULL),
(2, 'CASH_OUT', 1.85, 0.00, 'SENDER', NULL, NULL),
(3, 'SEND_MONEY', 0.00, 5.00, 'SENDER', NULL, NULL),
(4, 'PAYMENT', 1.50, 0.00, 'RECEIVER', NULL, NULL),
(5, 'PAY_BILL', 1.00, 0.00, 'SENDER', NULL, 30.00),
(6, 'B2B', 0.00, 0.00, 'SENDER', NULL, NULL);

-- [ROLE: CUSTOMER] - Personal Usage Limits
INSERT INTO "tp"."transaction_limits" 
("profile_type_id", "transaction_type_id", "max_count_daily", "max_count_monthly", "min_per_transaction", "max_per_transaction", "daily_limit", "monthly_limit") 
VALUES
(1, 1, 10, 100, 50.00, 50000.00, 50000.00, 300000.00),   -- Cash In
(1, 2, 10, 100, 50.00, 30000.00, 30000.00, 200000.00),   -- Cash Out
(1, 3, 50, 100, 0.01, 100000.00, 500000.00, 300000.00),  -- Send Money
(1, 4, NULL, NULL, 1.00, NULL, NULL, NULL);              -- Payment

-- [ROLE: AGENT] - Operational/Aggregate Volume Limits
-- Limits the total "Float" an agent can move in a day to prevent money laundering.
INSERT INTO "tp"."transaction_limits" 
("profile_type_id", "transaction_type_id", "max_count_daily", "max_count_monthly", "min_per_transaction", "max_per_transaction", "daily_limit", "monthly_limit") 
VALUES
(2, 1, NULL, NULL, 50.00, 50000.00, 500000.00, 5000000.00), -- Total Cash In volume
(2, 2, NULL, NULL, 50.00, 30000.00, 500000.00, 5000000.00), -- Total Cash Out volume
(2, 6, 50, 500, 1000.00, 200000.00, 200000.00, 5000000.00); -- B2B Restocking

-- [ROLE: MERCHANT] - Receiving and Payout Limits
INSERT INTO "tp"."transaction_limits" 
("profile_type_id", "transaction_type_id", "max_count_daily", "max_count_monthly", "min_per_transaction", "max_per_transaction", "daily_limit", "monthly_limit") 
VALUES
(3, 4, NULL, NULL, 1.00, NULL, NULL, NULL),                -- Receive Payment: Unlimited
(3, 6, 100, 1000, 10.00, 100000.00, 500000.00, 5000000.00);-- Merchant Payments Out

-- [ROLE: DISTRIBUTOR] - Supply Chain Limits
INSERT INTO "tp"."transaction_limits" 
("profile_type_id", "transaction_type_id", "max_count_daily", "max_count_monthly", "min_per_transaction", "max_per_transaction", "daily_limit", "monthly_limit") 
VALUES
(4, 6, NULL, NULL, 5000.00, 500000.00, 2000000.00, 50000000.00); -- B2B to Agents

-- 3. Commission Policies
-- Assuming System/Platform is Profile Type ID 6 (as per common schema patterns)
TRUNCATE "tp"."commission_policies" RESTART IDENTITY;
INSERT INTO "tp"."commission_policies" ("profile_type_id", "transaction_type_id", "commission_share")
VALUES
(2, 2, 70.00),  -- Agent gets 70% of the Cash Out fee
(4, 2, 10.00),  -- Distributor gets 10%
(6, 2, 20.00),  -- System gets 20%
(6, 3, 100.00), -- System takes 100% of Send Money fees
(6, 4, 100.00), -- System takes 100% of Merchant fees
(6, 5, 100.00); -- System takes 100% of Bill fees