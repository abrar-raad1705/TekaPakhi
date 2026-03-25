import pool, { DB_SCHEMA } from '../config/db.js';
import walletModel from '../models/walletModel.js';
import AppError from '../utils/AppError.js';

const walletService = {
  /**
   * Get wallet balance for the authenticated user
   */
  async getBalance(profileId) {
    const wallet = await walletModel.getBalance(profileId);

    if (!wallet) {
      throw new AppError('Wallet not found.', 404);
    }

    return {
      walletId: wallet.wallet_id,
      balance: parseFloat(wallet.balance),
      maxBalance: parseFloat(wallet.max_balance),
      lastActivityDate: wallet.last_activity_date,
      owner: {
        phoneNumber: wallet.phone_number,
        fullName: wallet.full_name,
        typeName: wallet.type_name,
      },
    };
  },

  async getDashboardStats(profileId) {
    const wallet = await walletModel.getBalance(profileId);
    if (!wallet) {
      throw new AppError('Wallet not found.', 404);
    }

    const commissionQuery = `
      SELECT COALESCE(SUM(le.amount), 0)::numeric AS total
      FROM ${DB_SCHEMA}.ledger_entries le
      JOIN ${DB_SCHEMA}.wallets w ON w.wallet_id = le.wallet_id
      WHERE w.profile_id = $1
        AND le.entry_type = 'CREDIT'
        AND (
          le.description ILIKE 'Commission share%'
          OR le.description ILIKE 'Commission Earned -%'
        )
        AND le.created_at >= date_trunc('month', CURRENT_DATE)
    `;

    if (wallet.type_name === 'AGENT') {
      const [cashInTodayResult, monthlyTransactionsResult, commissionResult] =
        await Promise.all([
          pool.query(
            `SELECT COUNT(*)::int AS count
             FROM ${DB_SCHEMA}.transactions t
             JOIN ${DB_SCHEMA}.transaction_types tt ON tt.type_id = t.type_id
             JOIN ${DB_SCHEMA}.wallets sw ON sw.wallet_id = t.sender_wallet_id
             WHERE sw.profile_id = $1
               AND tt.type_name = 'CASH_IN'
               AND t.status = 'COMPLETED'
               AND t.transaction_time >= CURRENT_DATE`,
            [profileId],
          ),
          pool.query(
            `SELECT COUNT(*)::int AS count
             FROM ${DB_SCHEMA}.transactions t
             JOIN ${DB_SCHEMA}.wallets sw ON sw.wallet_id = t.sender_wallet_id
             JOIN ${DB_SCHEMA}.wallets rw ON rw.wallet_id = t.receiver_wallet_id
             WHERE (sw.profile_id = $1 OR rw.profile_id = $1)
               AND t.status = 'COMPLETED'
               AND t.transaction_time >= date_trunc('month', CURRENT_DATE)`,
            [profileId],
          ),
          pool.query(commissionQuery, [profileId]),
        ]);

      return {
        role: 'AGENT',
        cashInTodayCount: Number(cashInTodayResult.rows[0]?.count || 0),
        monthlyTransactionCount: Number(monthlyTransactionsResult.rows[0]?.count || 0),
        commissionThisMonth: parseFloat(commissionResult.rows[0]?.total || 0),
      };
    }

    if (wallet.type_name === 'DISTRIBUTOR') {
      const [connectedAgentsResult, b2bResult, commissionResult] =
        await Promise.all([
          pool.query(
            `SELECT COUNT(*)::int AS count
             FROM ${DB_SCHEMA}.agent_profiles
             WHERE distributor_id = $1
               AND status = 'ACTIVE'`,
            [profileId],
          ),
          pool.query(
            `SELECT
               COUNT(*)::int AS count,
               COALESCE(SUM(t.amount), 0)::numeric AS total
             FROM ${DB_SCHEMA}.transactions t
             JOIN ${DB_SCHEMA}.transaction_types tt ON tt.type_id = t.type_id
             JOIN ${DB_SCHEMA}.wallets sw ON sw.wallet_id = t.sender_wallet_id
             WHERE sw.profile_id = $1
               AND tt.type_name = 'B2B'
               AND t.status = 'COMPLETED'
               AND t.transaction_time >= date_trunc('month', CURRENT_DATE)`,
            [profileId],
          ),
          pool.query(commissionQuery, [profileId]),
        ]);

      return {
        role: 'DISTRIBUTOR',
        connectedAgentCount: Number(connectedAgentsResult.rows[0]?.count || 0),
        b2bThisMonthCount: Number(b2bResult.rows[0]?.count || 0),
        b2bThisMonthAmount: parseFloat(b2bResult.rows[0]?.total || 0),
        commissionThisMonth: parseFloat(commissionResult.rows[0]?.total || 0),
      };
    }

    throw new AppError('Dashboard stats are not available for this account type.', 403);
  },
};

export default walletService;
