const pool = require('../config/db');

const adminModel = {
  // ── Dashboard Stats ──────────────────────────────────────────

  async getUserCountsByType(client = pool) {
    const result = await client.query(
      `SELECT pt.type_name, COUNT(*)::int AS count
       FROM tp.profiles p
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       GROUP BY pt.type_name, pt.type_id
       ORDER BY pt.type_id`
    );
    return result.rows;
  },


  async getTransactionStats(client = pool) {
    const result = await client.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COALESCE(SUM(amount), 0)::numeric AS total_volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS total_revenue
       FROM tp.transactions
       WHERE status = 'COMPLETED'`
    );
    return result.rows[0];
  },


  async getTodayStats(client = pool) {
    const result = await client.query(
      `SELECT
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS revenue
       FROM tp.transactions
       WHERE status = 'COMPLETED' AND transaction_time >= CURRENT_DATE`
    );
    return result.rows[0];
  },


  async getThisMonthStats(client = pool) {
    const result = await client.query(
      `SELECT
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS revenue
       FROM tp.transactions
       WHERE status = 'COMPLETED'
         AND transaction_time >= date_trunc('month', CURRENT_DATE)`
    );
    return result.rows[0];
  },


  async getMonthlyTrend(months = 6, client = pool) {
    const result = await client.query(
      `SELECT
         to_char(date_trunc('month', transaction_time), 'YYYY-MM') AS month,
         COUNT(*)::int AS count,
         COALESCE(SUM(amount), 0)::numeric AS volume,
         COALESCE(SUM(fee_amount), 0)::numeric AS revenue
       FROM tp.transactions
       WHERE status = 'COMPLETED'
         AND transaction_time >= date_trunc('month', CURRENT_DATE) - ($1 - 1) * INTERVAL '1 month'
       GROUP BY date_trunc('month', transaction_time)
       ORDER BY date_trunc('month', transaction_time)`,
      [months]
    );
    return result.rows;
  },


  async getRecentRegistrations(count = 5, client = pool) {
    const result = await client.query(
      `SELECT p.profile_id, p.phone_number, p.full_name, pt.type_name, p.registration_date
       FROM tp.profiles p
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       ORDER BY p.registration_date DESC
       LIMIT $1`,
      [count]
    );
    return result.rows;
  },


  // ── User Management ──────────────────────────────────────────

  async getUsers({ page = 1, limit = 20, search, typeId, status }, client = pool) {
    const whereChunks = ['1=1'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereChunks.push(`(p.phone_number ILIKE $${params.length} OR p.full_name ILIKE $${params.length})`);
    }
    if (typeId) {
      params.push(typeId);
      whereChunks.push(`p.type_id = $${params.length}`);
    }

    const offset = (page - 1) * limit;
    const whereClause = whereChunks.join(' AND ');

    // Query for data
    let dataQuery = `
      SELECT p.profile_id, p.phone_number, p.full_name, p.email,
             p.is_phone_verified, p.registration_date, p.type_id,
             pt.type_name, w.balance,
             COALESCE(cp.status, ap.status, mp.status, dp.status, bp.status)::text AS account_status
      FROM tp.profiles p
      JOIN tp.profile_types pt ON p.type_id = pt.type_id
      LEFT JOIN tp.wallets w ON p.profile_id = w.profile_id
      LEFT JOIN tp.customer_profiles cp ON p.profile_id = cp.profile_id AND p.type_id = 1
      LEFT JOIN tp.agent_profiles ap ON p.profile_id = ap.profile_id AND p.type_id = 2
      LEFT JOIN tp.merchant_profiles mp ON p.profile_id = mp.profile_id AND p.type_id = 3
      LEFT JOIN tp.distributor_profiles dp ON p.profile_id = dp.profile_id AND p.type_id = 4
      LEFT JOIN tp.biller_profiles bp ON p.profile_id = bp.profile_id AND p.type_id = 5
      WHERE ${whereClause}`;

    if (status) {
      params.push(status);
      dataQuery += ` AND COALESCE(cp.status, ap.status, mp.status, dp.status, bp.status)::text = $${params.length}`;
    }

    const dataParams = [...params];
    dataParams.push(limit);
    dataQuery += ` ORDER BY p.registration_date DESC LIMIT $${dataParams.length}`;
    dataParams.push(offset);
    dataQuery += ` OFFSET $${dataParams.length}`;

    // Query for count
    let countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tp.profiles p
      JOIN tp.profile_types pt ON p.type_id = pt.type_id
      LEFT JOIN tp.customer_profiles cp ON p.profile_id = cp.profile_id AND p.type_id = 1
      LEFT JOIN tp.agent_profiles ap ON p.profile_id = ap.profile_id AND p.type_id = 2
      LEFT JOIN tp.merchant_profiles mp ON p.profile_id = mp.profile_id AND p.type_id = 3
      LEFT JOIN tp.distributor_profiles dp ON p.profile_id = dp.profile_id AND p.type_id = 4
      LEFT JOIN tp.biller_profiles bp ON p.profile_id = bp.profile_id AND p.type_id = 5
      WHERE ${whereClause}`;

    if (status) {
      countQuery += ` AND COALESCE(cp.status, ap.status, mp.status, dp.status, bp.status)::text = $${params.length}`;
    }

    const [dataResult, countResult] = await Promise.all([
      client.query(dataQuery, dataParams),
      client.query(countQuery, params),
    ]);

    return {
      users: dataResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    };
  },


  async getUserDetail(profileId, client = pool) {
    // Profile with type, wallet, and subtype data
    const profileResult = await client.query(
      `SELECT p.*, pt.type_name, w.wallet_id, w.balance, w.max_balance, w.last_activity_date
       FROM tp.profiles p
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       LEFT JOIN tp.wallets w ON p.profile_id = w.profile_id
       WHERE p.profile_id = $1`,
      [profileId]
    );

    if (profileResult.rows.length === 0) return null;

    const profile = profileResult.rows[0];

    // Get subtype status
    const subtypeTableMap = {
      CUSTOMER: 'customer_profiles',
      AGENT: 'agent_profiles',
      MERCHANT: 'merchant_profiles',
      DISTRIBUTOR: 'distributor_profiles',
      BILLER: 'biller_profiles',
    };
    const table = subtypeTableMap[profile.type_name];
    let subtypeData = null;
    if (table) {
      const subResult = await client.query(`SELECT * FROM tp.${table} WHERE profile_id = $1`, [profileId]);
      subtypeData = subResult.rows[0] || null;
    }

    // Recent transactions (last 10)
    const txResult = await client.query(
      `SELECT t.transaction_id, t.transaction_ref, t.amount, t.fee_amount, t.status,
              t.transaction_time, tt.type_name,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
       FROM tp.transactions t
       JOIN tp.transaction_types tt ON t.type_id = tt.type_id
       LEFT JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
       LEFT JOIN tp.profiles sp ON sw.profile_id = sp.profile_id
       LEFT JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       LEFT JOIN tp.profiles rp ON rw.profile_id = rp.profile_id
       WHERE sw.profile_id = $1 OR rw.profile_id = $1
       ORDER BY t.transaction_time DESC
       LIMIT 10`,
      [profileId]
    );

    return {
      ...profile,
      subtypeData,
      recentTransactions: txResult.rows,
    };
  },

<<<<<<< Updated upstream
  async updateUserStatus(profileId, typeName, newStatus, client = null) {
=======
  async updateUserStatus(profileId, typeName, newStatus, client = pool) {

>>>>>>> Stashed changes
    const tableMap = {
      CUSTOMER: 'customer_profiles',
      AGENT: 'agent_profiles',
      MERCHANT: 'merchant_profiles',
      DISTRIBUTOR: 'distributor_profiles',
      BILLER: 'biller_profiles',
    };
    const table = tableMap[typeName];
    if (!table) return null;

    // biller_profiles has no approved_date column
    const hasApprovedDate = typeName !== 'BILLER';
    const approvedClause = (newStatus === 'ACTIVE' && hasApprovedDate) ? ', approved_date = CURRENT_TIMESTAMP' : '';
<<<<<<< Updated upstream
    const result = await (client || pool).query(
=======
    const result = await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.${table}
       SET status = $1 ${approvedClause}
       WHERE profile_id = $2
       RETURNING *`,
      [newStatus, profileId]
    );
    return result.rows[0] || null;
  },


  // ── Transaction Management (Admin) ───────────────────────────

  async getAllTransactions({ page = 1, limit = 20, search, typeId, status, fromDate, toDate }, client = pool) {

    const params = [];
    let paramIdx = 1;
    let whereExtra = '';

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
             sp.profile_id AS sender_profile_id, sp.full_name AS sender_name, sp.phone_number AS sender_phone,
             rp.profile_id AS receiver_profile_id, rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
      FROM tp.transactions t
      JOIN tp.transaction_types tt ON t.type_id = tt.type_id
      LEFT JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
      LEFT JOIN tp.profiles sp ON sw.profile_id = sp.profile_id
      LEFT JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
      LEFT JOIN tp.profiles rp ON rw.profile_id = rp.profile_id
      WHERE 1=1 ${whereExtra}
      ORDER BY t.transaction_time DESC

      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tp.transactions t
      JOIN tp.transaction_types tt ON t.type_id = tt.type_id
      JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
      JOIN tp.profiles sp ON sw.profile_id = sp.profile_id
      JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
      JOIN tp.profiles rp ON rw.profile_id = rp.profile_id
      WHERE 1=1 ${whereExtra}`;

    const dataParams = [...params, limit, offset];
    const countParams = [...params];

    const [dataResult, countResult] = await Promise.all([
      client.query(dataQuery, dataParams),
      client.query(countQuery, countParams),
    ]);


    return {
      transactions: dataResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    };
  },

  async getTransactionForReversal(transactionId, client = pool) {
    const result = await client.query(
      `SELECT t.*, tt.type_name, tt.fee_bearer,
              sw.profile_id AS sender_profile_id,
              rw.profile_id AS receiver_profile_id
       FROM tp.transactions t
       JOIN tp.transaction_types tt ON t.type_id = tt.type_id
       JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
       JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       WHERE t.transaction_id = $1`,
      [transactionId]
    );
    return result.rows[0] || null;
  },

  // ── Config Management ────────────────────────────────────────

  async getTransactionTypes(client = pool) {
    const result = await client.query(`SELECT * FROM tp.transaction_types ORDER BY type_id`);
    return result.rows;
  },

<<<<<<< Updated upstream
  async updateTransactionType(typeId, fields, client = null) {
=======

  async updateTransactionType(typeId, fields, client = pool) {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const result = await (client || pool).query(
=======
    const result = await client.query(
>>>>>>> Stashed changes
      `UPDATE tp.transaction_types SET ${setClauses.join(', ')} WHERE type_id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },


  async getTransactionLimits(client = pool) {
    const result = await client.query(
      `SELECT tl.*, pt.type_name AS profile_type_name, tt.type_name AS transaction_type_name
       FROM tp.transaction_limits tl
       JOIN tp.profile_types pt ON tl.profile_type_id = pt.type_id
       JOIN tp.transaction_types tt ON tl.transaction_type_id = tt.type_id
       ORDER BY tl.profile_type_id, tl.transaction_type_id`
    );
    return result.rows;
  },

<<<<<<< Updated upstream
  async upsertTransactionLimit(data, client = null) {
    const result = await (client || pool).query(
=======

  async upsertTransactionLimit(data, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.transaction_limits
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
        data.profileTypeId, data.transactionTypeId,
        data.dailyLimit || null, data.monthlyLimit || null,
        data.maxCountDaily || null, data.maxCountMonthly || null,
        data.minPerTransaction || null, data.maxPerTransaction || null,
      ]
    );
    return result.rows[0];
  },

<<<<<<< Updated upstream
  async deleteTransactionLimit(profileTypeId, transactionTypeId, client = null) {
    const result = await (client || pool).query(
=======

  async deleteTransactionLimit(profileTypeId, transactionTypeId, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `DELETE FROM tp.transaction_limits
       WHERE profile_type_id = $1 AND transaction_type_id = $2
       RETURNING *`,
      [profileTypeId, transactionTypeId]
    );
    return result.rows[0] || null;
  },


  async getCommissionPolicies(client = pool) {
    const result = await client.query(
      `SELECT cp.*, pt.type_name AS beneficiary_type_name, tt.type_name AS transaction_type_name
       FROM tp.commission_policies cp
       JOIN tp.profile_types pt ON cp.profile_type_id = pt.type_id
       JOIN tp.transaction_types tt ON cp.transaction_type_id = tt.type_id
       ORDER BY cp.transaction_type_id, cp.profile_type_id`
    );
    return result.rows;
  },

<<<<<<< Updated upstream
  async upsertCommissionPolicy(data, client = null) {
    const result = await (client || pool).query(
=======

  async upsertCommissionPolicy(data, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `INSERT INTO tp.commission_policies (profile_type_id, transaction_type_id, commission_share)
       VALUES ($1, $2, $3)
       ON CONFLICT (profile_type_id, transaction_type_id) DO UPDATE SET
         commission_share = EXCLUDED.commission_share
       RETURNING *`,
      [data.profileTypeId, data.transactionTypeId, data.commissionShare]
    );
    return result.rows[0];
  },

<<<<<<< Updated upstream
  async deleteCommissionPolicy(profileTypeId, transactionTypeId, client = null) {
    const result = await (client || pool).query(
=======

  async deleteCommissionPolicy(profileTypeId, transactionTypeId, client = pool) {
    const result = await client.query(
>>>>>>> Stashed changes
      `DELETE FROM tp.commission_policies
       WHERE profile_type_id = $1 AND transaction_type_id = $2
       RETURNING *`,
      [profileTypeId, transactionTypeId]
    );
    return result.rows[0] || null;
  },


  // ── Reports ──────────────────────────────────────────────────

  async getTransactionReport({ fromDate, toDate, groupBy = 'day' }, client = pool) {
    const truncFn = groupBy === 'month' ? "'month'" : groupBy === 'week' ? "'week'" : "'day'";
    const result = await client.query(
      `SELECT
         to_char(date_trunc(${truncFn}, t.transaction_time), 'YYYY-MM-DD') AS period,
         tt.type_name,
         COUNT(*)::int AS count,
         COALESCE(SUM(t.amount), 0)::numeric AS volume,
         COALESCE(SUM(t.fee_amount), 0)::numeric AS revenue
       FROM tp.transactions t
       JOIN tp.transaction_types tt ON t.type_id = tt.type_id
       WHERE t.status = 'COMPLETED'
         AND t.transaction_time >= $1
         AND t.transaction_time <= $2
       GROUP BY date_trunc(${truncFn}, t.transaction_time), tt.type_name
       ORDER BY period, tt.type_name`,
      [fromDate, toDate]
    );
    return result.rows;
  },


  // ── Platform Financial Stats ───────────────────────────────

  async getPlatformFinancials(client = pool) {
    // Total E-Money = sum of ALL wallet balances
    const emoneyResult = await client.query(
      `SELECT COALESCE(SUM(balance), 0)::numeric AS total_emoney FROM tp.wallets`
    );


    // System wallet balance (platform revenue from fees)
    const systemResult = await client.query(
      `SELECT COALESCE(w.balance, 0)::numeric AS system_balance
       FROM tp.wallets w
       JOIN tp.profiles p ON w.profile_id = p.profile_id
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE pt.type_name = 'SYSTEM'
       LIMIT 1`
    );


    // Total Float Loaded (admin loads to distributors) — identified by user_note prefix
    const floatResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_loaded
       FROM tp.transactions
       WHERE user_note LIKE 'ADMIN_LOAD:%' AND status = 'COMPLETED'`
    );


    const totalEmoney = parseFloat(emoneyResult.rows[0].total_emoney);
    const systemBalance = parseFloat(systemResult.rows[0]?.system_balance || 0);
    const totalFloatLoaded = parseFloat(floatResult.rows[0].total_loaded);

    return {
      totalFloatIssued: totalFloatLoaded,
      cashReserve: totalFloatLoaded,
      totalEmoney,
      platformRevenue: systemBalance,
      platformLiability: totalEmoney - systemBalance,
    };
  },

  async getUserGrowthReport({ fromDate, toDate, groupBy = 'day' }, client = pool) {
    const truncFn = groupBy === 'month' ? "'month'" : groupBy === 'week' ? "'week'" : "'day'";
    const result = await client.query(
      `SELECT
         to_char(date_trunc(${truncFn}, p.registration_date), 'YYYY-MM-DD') AS period,
         pt.type_name,
         COUNT(*)::int AS count
       FROM tp.profiles p
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE p.registration_date >= $1
         AND p.registration_date <= $2
       GROUP BY date_trunc(${truncFn}, p.registration_date), pt.type_name
       ORDER BY period, pt.type_name`,
      [fromDate, toDate]
    );
    return result.rows;
  },

};

module.exports = adminModel;
