TRUNCATE TABLE
    tp.admin_activity_logs,
    tp.admin_sessions,
    tp.system_logs,
    tp.admin_users,
    tp.ledger_entries,
    tp.transactions,
    tp.transaction_types,
    tp.transaction_limits,
    tp.commission_policies,
    tp.wallets,
    tp.saved_recipients,
    tp.customer_profiles,
    tp.agent_profiles,
    tp.merchant_profiles,
    tp.distributor_profiles,
    tp.biller_profiles,
    tp.profiles
RESTART IDENTITY
CASCADE;

SELECT * FROM tp.profiles;
