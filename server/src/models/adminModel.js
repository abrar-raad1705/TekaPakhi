import pool, { DB_SCHEMA } from '../config/db.js';

const adminModel = {
  // ── Dashboard Stats ──────────────────────────────────────────

  async getUserCountsByType() {
    const result = await pool.query(
      `SELECT pt.type_name, COUNT(*)::int AS count
       FROM ${DB_SCHEMA}.profiles p
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
       GROUP BY pt.type_name, pt.type_id
       ORDER BY pt.type_id`,
    );
    return result.rows;
  },

  async getTransactionStats() {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COALESCE(SUM(amount), 0)::numeric AS total_volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS total_revenue
       FROM ${DB_SCHEMA}.transactions
       WHERE status = 'COMPLETED'`,
    );
    return result.rows[0];
  },

  async getTodayStats() {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS revenue
       FROM ${DB_SCHEMA}.transactions
       WHERE status = 'COMPLETED' AND transaction_time >= CURRENT_DATE`,
    );
    return result.rows[0];
  },

  async getThisMonthStats() {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS revenue
       FROM ${DB_SCHEMA}.transactions
       WHERE status = 'COMPLETED'
         AND transaction_time >= date_trunc('month', CURRENT_DATE)`,
    );
    return result.rows[0];
  },

  async getMonthlyTrend(months = 6) {
    const result = await pool.query(
      `SELECT
         to_char(date_trunc('month', transaction_time), 'YYYY-MM') AS month,
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS revenue
       FROM ${DB_SCHEMA}.transactions
       WHERE status = 'COMPLETED'
         AND transaction_time >= date_trunc('month', CURRENT_DATE) - ($1 - 1) * INTERVAL '1 month'
       GROUP BY date_trunc('month', transaction_time)
       ORDER BY date_trunc('month', transaction_time)`,
      [months],
    );
    return result.rows;
  },

  async getRecentRegistrations(count = 5) {
    const result = await pool.query(
      `SELECT p.profile_id, p.phone_number, p.full_name, pt.type_name, p.registration_date
       FROM ${DB_SCHEMA}.profiles p
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
       WHERE pt.type_name != 'SYSTEM'
       ORDER BY p.registration_date DESC
       LIMIT $1`,
      [count],
    );
    return result.rows;
  },

  // ── User Management ──────────────────────────────────────────

  async getUsers({ page = 1, limit = 20, search, typeId, status }) {
    const params = [];
    let paramIdx = 1;
    let whereExtra = " AND pt.type_name != 'SYSTEM'";

    if (search) {
      whereExtra += ` AND (p.phone_number ILIKE $${paramIdx} OR p.full_name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (typeId) {
      whereExtra += ` AND p.type_id = $${paramIdx}`;
      params.push(typeId);
      paramIdx++;
    }

    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT p.profile_id, p.phone_number, p.full_name, p.email,
             p.profile_picture_url, p.is_phone_verified, p.registration_date, p.type_id,
             pt.type_name, w.balance,
             p.account_status
      FROM ${DB_SCHEMA}.profiles p
      JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
      LEFT JOIN ${DB_SCHEMA}.wallets w ON p.profile_id = w.profile_id
      WHERE 1=1 ${whereExtra}
      ${status ? `AND p.account_status::text = $${paramIdx}` : ""}
      ORDER BY p.registration_date DESC
      LIMIT $${status ? paramIdx + 1 : paramIdx} OFFSET $${status ? paramIdx + 2 : paramIdx + 1}`;

    const dataParams = [...params];
    if (status) dataParams.push(status);
    dataParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM ${DB_SCHEMA}.profiles p
      JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
      WHERE 1=1 ${whereExtra}
      ${status ? `AND p.account_status::text = $${paramIdx}` : ""}`;

    const countParams = [...params];
    if (status) countParams.push(status);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, countParams),
    ]);

    return {
      users: dataResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    };
  },

  async getUserDetail(profileId) {
    // Profile with type, wallet, and subtype data
    const profileResult = await pool.query(
      `SELECT p.*, pt.type_name, w.wallet_id, w.balance, w.max_balance, w.last_activity_date
       FROM ${DB_SCHEMA}.profiles p
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
       LEFT JOIN ${DB_SCHEMA}.wallets w ON p.profile_id = w.profile_id
       WHERE p.profile_id = $1`,
      [profileId],
    );
    if (profileResult.rows.length === 0) return null;

    const profile = profileResult.rows[0];

    // Get subtype status
    const subtypeTableMap = {
      CUSTOMER: "customer_profiles",
      AGENT: "agent_profiles",
      MERCHANT: "merchant_profiles",
      DISTRIBUTOR: "distributor_profiles",
      BILLER: "biller_profiles",
    };
    const table = subtypeTableMap[profile.type_name];
    let subtypeData = null;
    if (table) {
      const subResult = await pool.query(
        `SELECT * FROM ${DB_SCHEMA}.${table} WHERE profile_id = $1`,
        [profileId],
      );
      subtypeData = subResult.rows[0] || null;
    }

    // Recent transactions (last 10)
    const txResult = await pool.query(
      `SELECT t.transaction_id, t.transaction_ref, t.amount, t.fee_amount, t.status,
              t.transaction_time, t.original_transaction_id, tt.type_name,
              orig_t.transaction_ref AS original_transaction_ref,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
       JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
       JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
       JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
       LEFT JOIN ${DB_SCHEMA}.transactions orig_t ON t.original_transaction_id = orig_t.transaction_id
       WHERE sw.profile_id = $1 OR rw.profile_id = $1
       ORDER BY t.transaction_time DESC
       LIMIT 10`,
      [profileId],
    );

    // Get subtype details (specifically for AGENT-DISTRIBUTOR relations)
    let linkedData = {};
    if (profile.type_name === "AGENT" && subtypeData?.distributor_id) {
      const distResult = await pool.query(
        `SELECT p.profile_id, p.full_name, p.phone_number, p.profile_picture_url, dp.business_name 
         FROM ${DB_SCHEMA}.profiles p 
         JOIN ${DB_SCHEMA}.distributor_profiles dp ON p.profile_id = dp.profile_id 
         WHERE p.profile_id = $1`,
        [subtypeData.distributor_id],
      );
      const areasResult = await pool.query(
        `SELECT district, area FROM ${DB_SCHEMA}.distributor_areas WHERE profile_id = $1`,
        [subtypeData.distributor_id],
      );
      linkedData.distributor = {
        ...distResult.rows[0],
        areas: areasResult.rows,
      };
    }

    if (profile.type_name === "DISTRIBUTOR") {
      const areasResult = await pool.query(
        `SELECT district, area FROM ${DB_SCHEMA}.distributor_areas WHERE profile_id = $1`,
        [profileId],
      );
      linkedData.areas = areasResult.rows;

      const agentsResult = await pool.query(
        `SELECT p.profile_id, p.full_name, p.phone_number, p.profile_picture_url, ap.agent_code, ap.shop_name, p.account_status
         FROM ${DB_SCHEMA}.agent_profiles ap
         JOIN ${DB_SCHEMA}.profiles p ON ap.profile_id = p.profile_id
         WHERE ap.distributor_id = $1`,
        [profileId],
      );
      linkedData.agents = agentsResult.rows;
    }

    return {
      ...profile,
      subtypeData,
      recentTransactions: txResult.rows,
      ...linkedData,
    };
  },

  async updateUserStatus(profileId, typeName, newStatus, client = null) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.profiles
       SET account_status = $1
       WHERE profile_id = $2
       RETURNING *`,
      [newStatus, profileId],
    );

    if (newStatus === "ACTIVE") {
      const subtypeTableMap = {
        CUSTOMER: "customer_profiles",
        AGENT: "agent_profiles",
        MERCHANT: "merchant_profiles",
        DISTRIBUTOR: "distributor_profiles",
      };
      const table = subtypeTableMap[typeName];
      if (table) {
        await db.query(
          `UPDATE ${DB_SCHEMA}.${table} SET approved_date = CURRENT_TIMESTAMP WHERE profile_id = $1`,
          [profileId],
        );
      }
    }

    return result.rows[0] || null;
  },

  // ── Transaction Management (Admin) ───────────────────────────

  async getAllTransactions({
    page = 1,
    limit = 20,
    search,
    typeId,
    status,
    fromDate,
    toDate,
  }) {
    const params = [];
    let paramIdx = 1;
    let whereExtra = "";

    if (typeId) {
      whereExtra += ` AND t.type_id = $${paramIdx}`;
      params.push(typeId);
      paramIdx++;
    }
    if (status) {
      whereExtra += ` AND t.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }
    if (fromDate) {
      whereExtra += ` AND t.transaction_time >= $${paramIdx}`;
      params.push(fromDate);
      paramIdx++;
    }
    if (toDate) {
      whereExtra += ` AND t.transaction_time <= $${paramIdx}`;
      params.push(toDate);
      paramIdx++;
    }
    if (search) {
      whereExtra += ` AND (t.transaction_ref ILIKE $${paramIdx} OR sp.phone_number ILIKE $${paramIdx} OR rp.phone_number ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT t.transaction_id, t.transaction_ref, t.amount, t.fee_amount, t.status,
             t.transaction_time, t.user_note, t.original_transaction_id, tt.type_name,
             orig_t.transaction_ref AS original_transaction_ref,
             sp.profile_id AS sender_profile_id, sp.full_name AS sender_name, sp.phone_number AS sender_phone,
             rp.profile_id AS receiver_profile_id, rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
      FROM ${DB_SCHEMA}.transactions t
      JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
      JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
      JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
      JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
      JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
      LEFT JOIN ${DB_SCHEMA}.transactions orig_t ON t.original_transaction_id = orig_t.transaction_id
      WHERE 1=1 ${whereExtra}
      ORDER BY t.transaction_time DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM ${DB_SCHEMA}.transactions t
      JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
      JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
      JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
      JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
      JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
      WHERE 1=1 ${whereExtra}`;

    const dataParams = [...params, limit, offset];
    const countParams = [...params];

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, countParams),
    ]);

    return {
      transactions: dataResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    };
  },

  async getTransactionDetail(transactionId) {
    const [headerRes, auditRes, ledgerRes] = await Promise.all([
      // 1. Transaction header with sender/receiver details
      pool.query(
        `SELECT t.transaction_id, t.transaction_ref, t.amount, t.fee_amount, t.status,
                t.transaction_time, t.user_note, t.original_transaction_id,
                tt.type_name,
                orig_t.transaction_ref AS original_transaction_ref,
                t.sender_wallet_id, t.receiver_wallet_id,
                sp.profile_id AS sender_profile_id, sp.full_name AS sender_name,
                sp.phone_number AS sender_phone, spt.type_name AS sender_type,
                rp.profile_id AS receiver_profile_id, rp.full_name AS receiver_name,
                rp.phone_number AS receiver_phone, rpt.type_name AS receiver_type
         FROM ${DB_SCHEMA}.transactions t
         JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
         JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
         JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
         JOIN ${DB_SCHEMA}.profile_types spt ON sp.type_id = spt.type_id
         JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
         JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
         JOIN ${DB_SCHEMA}.profile_types rpt ON rp.type_id = rpt.type_id
         LEFT JOIN ${DB_SCHEMA}.transactions orig_t ON t.original_transaction_id = orig_t.transaction_id
         WHERE t.transaction_id = $1`,
        [transactionId],
      ),

      // 2. Audit logs referencing this transaction
      pool.query(
        `SELECT al.id AS audit_id, al.event_type, al.actor_id, al.actor_type,
                al.summary, al.details, al.created_at,
                p.full_name AS actor_name, p.phone_number AS actor_phone
         FROM ${DB_SCHEMA}.audit_logs al
         LEFT JOIN ${DB_SCHEMA}.profiles p ON al.actor_id = p.profile_id
         WHERE al.related_transaction_id = $1
         ORDER BY al.created_at ASC`,
        [transactionId],
      ),

      // 3. Ledger entries with profile name for each wallet
      pool.query(
        `SELECT le.id, le.entry_type, le.amount, le.description,
                le.before_balance, le.after_balance, le.created_at,
                le.wallet_id,
                p.full_name AS wallet_owner_name, p.phone_number AS wallet_owner_phone,
                pt.type_name AS wallet_owner_type,
                w.role AS wallet_role
         FROM ${DB_SCHEMA}.ledger_entries le
         JOIN ${DB_SCHEMA}.wallets w ON le.wallet_id = w.wallet_id
         JOIN ${DB_SCHEMA}.profiles p ON w.profile_id = p.profile_id
         JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
         WHERE le.transaction_id = $1
         ORDER BY le.id ASC`,
        [transactionId],
      ),
    ]);

    if (headerRes.rows.length === 0) return null;

    return {
      transaction: headerRes.rows[0],
      auditLogs: auditRes.rows,
      ledgerEntries: ledgerRes.rows,
    };
  },

  async getTransactionForReversal(transactionId) {
    const result = await pool.query(
      `SELECT t.*, tt.type_name, tt.fee_bearer,
              sw.profile_id AS sender_profile_id,
              rw.profile_id AS receiver_profile_id
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
       JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
       JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       WHERE t.transaction_id = $1`,
      [transactionId],
    );
    return result.rows[0] || null;
  },

  // ── Config Management ────────────────────────────────────────

  async getTransactionTypes() {
    const result = await pool.query(
      `SELECT * FROM ${DB_SCHEMA}.transaction_types ORDER BY type_id`,
    );
    return result.rows;
  },

  async updateTransactionType(typeId, fields, client = null) {
    const db = client || pool;
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(fields)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }
    if (setClauses.length === 0) return null;

    values.push(typeId);
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.transaction_types SET ${setClauses.join(", ")} WHERE type_id = $${idx} RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  },

  async getTransactionLimits() {
    const result = await pool.query(
      `SELECT tl.*, pt.type_name AS profile_type_name, tt.type_name AS transaction_type_name
       FROM ${DB_SCHEMA}.transaction_limits tl
       JOIN ${DB_SCHEMA}.profile_types pt ON tl.profile_type_id = pt.type_id
       JOIN ${DB_SCHEMA}.transaction_types tt ON tl.transaction_type_id = tt.type_id
       ORDER BY tl.profile_type_id, tl.transaction_type_id`,
    );
    return result.rows;
  },

  async upsertTransactionLimit(data, client = null) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.transaction_limits
         (profile_type_id, transaction_type_id, daily_limit, monthly_limit,
          max_count_daily, max_count_monthly, min_per_transaction, max_per_transaction)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (profile_type_id, transaction_type_id) DO UPDATE SET
         daily_limit = EXCLUDED.daily_limit,
         monthly_limit = EXCLUDED.monthly_limit,
         max_count_daily = EXCLUDED.max_count_daily,
         max_count_monthly = EXCLUDED.max_count_monthly,
         min_per_transaction = EXCLUDED.min_per_transaction,
         max_per_transaction = EXCLUDED.max_per_transaction
       RETURNING *`,
      [
        data.profileTypeId,
        data.transactionTypeId,
        data.dailyLimit || null,
        data.monthlyLimit || null,
        data.maxCountDaily || null,
        data.maxCountMonthly || null,
        data.minPerTransaction || null,
        data.maxPerTransaction || null,
      ],
    );
    return result.rows[0];
  },

  async deleteTransactionLimit(profileTypeId, transactionTypeId) {
    const result = await pool.query(
      `DELETE FROM ${DB_SCHEMA}.transaction_limits
       WHERE profile_type_id = $1 AND transaction_type_id = $2
       RETURNING *`,
      [profileTypeId, transactionTypeId],
    );
    return result.rows[0] || null;
  },

  async getCommissionPolicies() {
    const result = await pool.query(
      `SELECT cp.*, pt.type_name AS beneficiary_type_name, tt.type_name AS transaction_type_name
       FROM ${DB_SCHEMA}.commission_policies cp
       JOIN ${DB_SCHEMA}.profile_types pt ON cp.profile_type_id = pt.type_id
       JOIN ${DB_SCHEMA}.transaction_types tt ON cp.transaction_type_id = tt.type_id
       ORDER BY cp.transaction_type_id, cp.profile_type_id`,
    );
    return result.rows;
  },

  async upsertCommissionPolicy(data, client = null) {
    const db = client || pool;
    const result = await db.query(
      `INSERT INTO ${DB_SCHEMA}.commission_policies (profile_type_id, transaction_type_id, commission_share)
       VALUES ($1, $2, $3)
       ON CONFLICT (profile_type_id, transaction_type_id) DO UPDATE SET
         commission_share = EXCLUDED.commission_share
       RETURNING *`,
      [data.profileTypeId, data.transactionTypeId, data.commissionShare],
    );
    return result.rows[0];
  },

  async deleteCommissionPolicy(profileTypeId, transactionTypeId) {
    const result = await pool.query(
      `DELETE FROM ${DB_SCHEMA}.commission_policies
       WHERE profile_type_id = $1 AND transaction_type_id = $2
       RETURNING *`,
      [profileTypeId, transactionTypeId],
    );
    return result.rows[0] || null;
  },

  async getProfileTypes() {
    const result = await pool.query(
      `SELECT * FROM ${DB_SCHEMA}.profile_types ORDER BY type_id`,
    );
    return result.rows;
  },

  // ── Reports ──────────────────────────────────────────────────

  async getTransactionReport({ fromDate, toDate, groupBy = "day" }) {
    const truncFn =
      groupBy === "month" ? "'month'" : groupBy === "week" ? "'week'" : "'day'";
    const result = await pool.query(
      `SELECT
         to_char(date_trunc(${truncFn}, t.transaction_time), 'YYYY-MM-DD') AS period,
         tt.type_name,
         COUNT(*)::int AS count,
         COALESCE(SUM(t.amount), 0)::numeric AS volume,
         COALESCE(SUM(t.fee_amount), 0)::numeric AS revenue
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
       WHERE t.status = 'COMPLETED'
         AND t.transaction_time >= $1
         AND t.transaction_time <= $2
       GROUP BY date_trunc(${truncFn}, t.transaction_time), tt.type_name
       ORDER BY period, tt.type_name`,
      [fromDate, toDate],
    );
    return result.rows;
  },

  // ── Platform Financial Stats ───────────────────────────────

  async getPlatformFinancials() {
    const emoneyResult = await pool.query(
      `SELECT COALESCE(SUM(balance), 0)::numeric AS total_emoney FROM ${DB_SCHEMA}.wallets`,
    );

    const systemWallets = await pool.query(
      `SELECT role::text AS role, COALESCE(balance, 0)::numeric AS balance
       FROM ${DB_SCHEMA}.wallets
       WHERE role IS NOT NULL`,
    );

    const byRole = {};
    for (const row of systemWallets.rows) {
      byRole[row.role] = parseFloat(row.balance);
    }

    const floatResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_loaded
       FROM ${DB_SCHEMA}.transactions
       WHERE user_note LIKE 'ADMIN_LOAD:%' AND status = 'COMPLETED'`,
    );

    const totalEmoney = parseFloat(emoneyResult.rows[0].total_emoney);
    const totalFloatLoaded = parseFloat(floatResult.rows[0].total_loaded);
    const treasuryBalance = byRole.TREASURY ?? 0;
    const revenueBalance = byRole.REVENUE ?? 0;
    const adjustmentBalance = byRole.ADJUSTMENT ?? 0;

    return {
      totalFloatIssued: totalFloatLoaded,
      cashReserve: treasuryBalance + revenueBalance,
      totalEmoney,
      treasuryBalance,
      revenueBalance,
      adjustmentBalance,
      platformRevenue: revenueBalance,
      platformLiability: treasuryBalance,
    };
  },

  async getUserGrowthReport({ fromDate, toDate, groupBy = "day" }) {
    const truncFn =
      groupBy === "month" ? "'month'" : groupBy === "week" ? "'week'" : "'day'";
    const result = await pool.query(
      `SELECT
         to_char(date_trunc(${truncFn}, p.registration_date), 'YYYY-MM-DD') AS period,
         pt.type_name,
         COUNT(*)::int AS count
       FROM ${DB_SCHEMA}.profiles p
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
       WHERE p.registration_date >= $1
         AND p.registration_date <= $2
       GROUP BY date_trunc(${truncFn}, p.registration_date), pt.type_name
       ORDER BY period, pt.type_name`,
      [fromDate, toDate],
    );
    return result.rows;
  },
};

export default adminModel;
