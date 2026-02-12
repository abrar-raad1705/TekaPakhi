-- Add limit columns
ALTER TABLE "tp"."transaction_limits" 
ADD COLUMN "max_count_daily" int4,
ADD COLUMN "max_count_monthly" int4,
ADD COLUMN "min_per_transaction" numeric(15,2),
ADD COLUMN "max_per_transaction" numeric(15,2);