TRUNCATE TABLE
    commission_entries,
    transactions,
    wallets,
    saved_recipients,
    customer_profiles,
    agent_profiles,
    merchant_profiles,
    distributor_profiles,
    biller_profiles,
    profiles,
    transaction_limits,
    commission_policies,
    transaction_types,
    profile_types
RESTART IDENTITY
CASCADE;
