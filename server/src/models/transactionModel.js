const pool = require('../config/db');

const transactionModel = {
  /**
   * Insert a new transaction
   */
  async create({ txRef, amount, fee, typeId, senderWalletId, receiverWalletId, senderDebit, receiverCredit, note, status = 'COMPLETED' }, client = pool) {
    const result = await client.query(
      `INSERT INTO tp.transactions
         (transaction_ref, amount, fee_amount, type_id, sender_wallet_id, receiver_wallet_id, sender_debit, receiver_credit, user_note, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::tp.transaction_status)
       RETURNING *`,
      [txRef, amount, fee, typeId, senderWalletId, receiverWalletId, senderDebit, receiverCredit, note, status]
    );
    return result.rows[0];
  },

  /**
<<<<<<< Updated upstream
=======
   * Generate a new transaction_ref and insert
   */
  async createWithTxRef(
    { amount, fee, typeId, senderWalletId, receiverWalletId, senderDebit, receiverCredit, note, status = 'COMPLETED' },
    options,
    client = pool
  ) {
    const { txRef, result: row } = await allocateUniqueTxRef(
      (txRef) => this.create({ txRef, amount, fee, typeId, senderWalletId, receiverWalletId, senderDebit, receiverCredit, note, status }, client),
      options
    );
    return { txRef, row };
  },



  /**
>>>>>>> Stashed changes
   * Find transaction by reference (public receipt lookup)
   */
  async findByRef(txRef, client = pool) {
    const result = await client.query(
      `SELECT t.*, tt.type_name,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
       FROM tp.transactions t
       JOIN tp.transaction_types tt ON t.type_id = tt.type_id
       LEFT JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
       LEFT JOIN tp.profiles sp ON sw.profile_id = sp.profile_id
       LEFT JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       LEFT JOIN tp.profiles rp ON rw.profile_id = rp.profile_id
       WHERE t.transaction_ref = $1`,
      [txRef]
    );
    return result.rows[0] || null;
  },

  /**
   * Find transaction by ID with full details
   */
<<<<<<< Updated upstream
  async findByIdForProfile(transactionId, profileId) {
    const result = await pool.query(
      `SELECT t.*, tt.type_name,
=======
  async findByIdForProfile(transactionId, profileId, client = pool) {
    const result = await client.query(
      `SELECT t.*, tt.type_name, tt.fee_bearer,
>>>>>>> Stashed changes
              sw.profile_id AS sender_profile_id,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              rw.profile_id AS receiver_profile_id,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
       FROM tp.transactions t
       JOIN tp.transaction_types tt ON t.type_id = tt.type_id
       LEFT JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
       LEFT JOIN tp.profiles sp ON sw.profile_id = sp.profile_id
       LEFT JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       LEFT JOIN tp.profiles rp ON rw.profile_id = rp.profile_id
       WHERE t.transaction_id = $1
         AND (sw.profile_id = $2 OR rw.profile_id = $2)`,
      [transactionId, profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Paginated transaction history for a profile
   */
  async findByProfileId(profileId, { page = 1, limit = 20, type = null, fromDate = null, toDate = null } = {}, client = pool) {
    const offset = (page - 1) * limit;
    const params = [profileId];
    let paramIdx = 2;

    let whereExtra = '';
    if (type) {
      whereExtra += ` AND tt.type_name = $${paramIdx++}`;
      params.push(type);
    }
    if (fromDate) {
      whereExtra += ` AND t.transaction_time >= $${paramIdx++}`;
      params.push(fromDate);
    }
    if (toDate) {
      whereExtra += ` AND t.transaction_time <= $${paramIdx++}`;
      params.push(toDate);
    }

    params.push(limit, offset);

    const dataQuery = `
      SELECT t.*, tt.type_name,
             sw.profile_id AS sender_profile_id,
             sp.full_name AS sender_name, sp.phone_number AS sender_phone,
             rw.profile_id AS receiver_profile_id,
             rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
      FROM tp.transactions t
      JOIN tp.transaction_types tt ON t.type_id = tt.type_id
      LEFT JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
      LEFT JOIN tp.profiles sp ON sw.profile_id = sp.profile_id
      LEFT JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
      LEFT JOIN tp.profiles rp ON rw.profile_id = rp.profile_id
      WHERE (sw.profile_id = $1 OR rw.profile_id = $1)
        ${whereExtra}
      ORDER BY t.transaction_time DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tp.transactions t
      JOIN tp.transaction_types tt ON t.type_id = tt.type_id
      LEFT JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
      LEFT JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
      WHERE (sw.profile_id = $1 OR rw.profile_id = $1)
        ${whereExtra}`;


    const [dataResult, countResult] = await Promise.all([
      client.query(dataQuery, params),
      client.query(countQuery, params.slice(0, -2)), // exclude limit/offset
    ]);

    return {
      transactions: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limit),
    };
  },

  /**
   * Count transactions today for a specific profile + type (for limit checking)
   */
  async countToday(profileId, typeId, client = pool) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(t.amount), 0)::numeric AS total_amount
       FROM tp.transactions t
       JOIN tp.wallets w ON t.sender_wallet_id = w.wallet_id
       WHERE w.profile_id = $1 AND t.type_id = $2
         AND t.status = 'COMPLETED'
         AND t.transaction_time >= CURRENT_DATE`,
      [profileId, typeId]
    );
    return result.rows[0];
  },

  /**
   * Count transactions this month for a specific profile + type
   */
  async countThisMonth(profileId, typeId, client = pool) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(t.amount), 0)::numeric AS total_amount
       FROM tp.transactions t
       JOIN tp.wallets w ON t.sender_wallet_id = w.wallet_id
       WHERE w.profile_id = $1 AND t.type_id = $2
         AND t.status = 'COMPLETED'
         AND t.transaction_time >= date_trunc('month', CURRENT_DATE)`,
      [profileId, typeId]
    );
    return result.rows[0];
  },

  /**
   * Get the monthly Send Money total for a profile
   */
  async getMonthlyTotal(profileId, typeId, client = pool) {
    const result = await client.query(
      `SELECT COALESCE(SUM(t.amount), 0)::numeric AS total_amount
       FROM tp.transactions t
       JOIN tp.wallets w ON t.sender_wallet_id = w.wallet_id
       WHERE w.profile_id = $1 AND t.type_id = $2
         AND t.status = 'COMPLETED'
         AND t.transaction_time >= date_trunc('month', CURRENT_DATE)`,
      [profileId, typeId]
    );
    return parseFloat(result.rows[0].total_amount);
  },

  /**
   * Get the monthly Send Money total within a transaction client (for update).
   */
  async getMonthlyTotalForUpdate(profileId, typeId, client = pool) {
    const result = await client.query(
      `SELECT COALESCE(SUM(t.amount), 0)::numeric AS total_amount
       FROM tp.transactions t
       JOIN tp.wallets w ON t.sender_wallet_id = w.wallet_id
       WHERE w.profile_id = $1 AND t.type_id = $2
         AND t.status = 'COMPLETED'
         AND t.transaction_time >= date_trunc('month', CURRENT_DATE)`,
      [profileId, typeId]
    );
    return parseFloat(result.rows[0].total_amount);
  },

  /**
   * Get last N transactions for mini statement
   */
  async miniStatement(profileId, count = 5, client = pool) {
    const result = await client.query(
      `SELECT t.*, tt.type_name,
              sw.profile_id AS sender_profile_id,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              rw.profile_id AS receiver_profile_id,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone
       FROM tp.transactions t
       JOIN tp.transaction_types tt ON t.type_id = tt.type_id
       LEFT JOIN tp.wallets sw ON t.sender_wallet_id = sw.wallet_id
       LEFT JOIN tp.profiles sp ON sw.profile_id = sp.profile_id
       LEFT JOIN tp.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       LEFT JOIN tp.profiles rp ON rw.profile_id = rp.profile_id
       WHERE (sw.profile_id = $1 OR rw.profile_id = $1)
         AND t.status = 'COMPLETED'
       ORDER BY t.transaction_time DESC
       LIMIT $2`,
      [profileId, count]
    );
    return result.rows;
  },
};

module.exports = transactionModel;
