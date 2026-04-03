import pool, { DB_SCHEMA } from '../config/db.js';
import { allocateUniqueTxRef } from '../utils/txRef.js';

const transactionModel = {
  /**
   * Insert a new transaction (within an existing DB client/transaction)
   */
  async create(client, { txRef, amount, fee, typeId, senderWalletId, receiverWalletId, note, status = 'COMPLETED' }) {
    const result = await client.query(
      `INSERT INTO ${DB_SCHEMA}.transactions
         (transaction_ref, amount, fee_amount, type_id, sender_wallet_id, receiver_wallet_id, user_note, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::${DB_SCHEMA}.transaction_status)
       RETURNING *`,
      [txRef, amount, fee, typeId, senderWalletId, receiverWalletId, note, status]
    );
    return result.rows[0];
  },

  /**
   * Generate a new transaction_ref and insert; retries on UNIQUE(transaction_ref) collisions.
   * Ref is immutable after this insert — never update transaction_ref.
   */
  async createWithTxRef(
    client,
    { amount, fee, typeId, senderWalletId, receiverWalletId, note, status = 'COMPLETED' },
    options
  ) {
    const { txRef, result: row } = await allocateUniqueTxRef(
      (txRef) => this.create(client, { txRef, amount, fee, typeId, senderWalletId, receiverWalletId, note, status }),
      options
    );
    return { txRef, row };
  },

  /**
   * Execute transaction via Stored Procedure
   */
  async executeProcedure(
    client,
    { senderWalletId, receiverWalletId, amount, fee, typeId, note },
    options
  ) {
    const { txRef, result: transactionId } = await allocateUniqueTxRef(
      async (txRefStr) => {
        const res = await client.query(
          `CALL ${DB_SCHEMA}.sp_execute_transaction($1, $2, $3, $4, $5, $6, null)`,
          [senderWalletId, receiverWalletId, amount, fee, typeId, txRefStr]
        );
        
        if (note) {
          await client.query(
            `UPDATE ${DB_SCHEMA}.transactions SET user_note = $1 WHERE transaction_id = $2`,
            [note, res.rows[0].p_transaction_id]
          );
        }
        
        return res.rows[0].p_transaction_id;
      },
      options
    );
    return { txRef, transactionId };
  },

  /**
   * Insert bill payment details for a PAY_BILL transaction
   */
  async createBillDetails(client, { transactionId, billAccountNumber, billContactNumber }) {
    await client.query(
      `INSERT INTO ${DB_SCHEMA}.bill_payment_details (transaction_id, bill_account_number, bill_contact_number)
       VALUES ($1, $2, $3)`,
      [transactionId, billAccountNumber, billContactNumber]
    );
  },

  /**
   * Find transaction by reference (public receipt lookup)
   */
  async findByRef(txRef) {
    const result = await pool.query(
      `SELECT t.*, tt.type_name,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              sp.profile_picture_url AS sender_profile_picture_url,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone,
              rp.profile_picture_url AS receiver_profile_picture_url,
              bpd.bill_account_number, bpd.bill_contact_number
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
       JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
       JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
       JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
       LEFT JOIN ${DB_SCHEMA}.bill_payment_details bpd ON t.transaction_id = bpd.transaction_id
       WHERE t.transaction_ref = $1`,
      [txRef]
    );
    return result.rows[0] || null;
  },

  /**
   * Find transaction by ID with full details
   */
  async findByIdForProfile(transactionId, profileId) {
    const result = await pool.query(
      `SELECT t.*, tt.type_name, tt.fee_bearer,
              sw.profile_id AS sender_profile_id,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              sp.profile_picture_url AS sender_profile_picture_url,
              rw.profile_id AS receiver_profile_id,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone,
              rp.profile_picture_url AS receiver_profile_picture_url,
              bpd.bill_account_number, bpd.bill_contact_number
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
       JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
       JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
       JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
       LEFT JOIN ${DB_SCHEMA}.bill_payment_details bpd ON t.transaction_id = bpd.transaction_id
       WHERE t.transaction_id = $1
         AND (
           sw.profile_id = $2 
           OR rw.profile_id = $2
           OR EXISTS (
             SELECT 1 FROM ${DB_SCHEMA}.ledger_entries le
             JOIN ${DB_SCHEMA}.wallets w ON le.wallet_id = w.wallet_id
             WHERE le.transaction_id = t.transaction_id AND w.profile_id = $2
           )
         )`,
      [transactionId, profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Paginated transaction history for a profile
   */
  async findByProfileId(profileId, { page = 1, limit = 20, type = null, fromDate = null, toDate = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [profileId];
    let paramIdx = 2;

    let whereExtra = 'WHERE 1=1';
    if (type) {
      whereExtra += ` AND history.type_name = $${paramIdx++}`;
      params.push(type);
    }
    if (fromDate) {
      whereExtra += ` AND history.transaction_time >= $${paramIdx++}`;
      params.push(fromDate);
    }
    if (toDate) {
      whereExtra += ` AND history.transaction_time <= $${paramIdx++}`;
      params.push(toDate);
    }

    params.push(limit, offset);

    const dataQuery = `
      WITH history AS (
        SELECT
          CONCAT('TX-', t.transaction_id) AS history_id,
          'TRANSACTION' AS history_kind,
          NULL::bigint AS ledger_entry_id,
          t.transaction_id,
          t.transaction_ref,
          t.transaction_time,
          t.amount,
          t.fee_amount,
          tt.type_name,
          NULL::varchar AS source_tx_type_name,
          t.user_note,
          t.status,
          sw.profile_id AS sender_profile_id,
          sp.full_name AS sender_name,
          sp.phone_number AS sender_phone,
          sp.profile_picture_url AS sender_profile_picture_url,
          rw.profile_id AS receiver_profile_id,
          rp.full_name AS receiver_name,
          rp.phone_number AS receiver_phone,
          rp.profile_picture_url AS receiver_profile_picture_url
        FROM ${DB_SCHEMA}.transactions t
        JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
        JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
        JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
        JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
        JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
        WHERE (sw.profile_id = $1 OR rw.profile_id = $1)

        UNION ALL

        SELECT
          CONCAT('LE-', le.id) AS history_id,
          'COMMISSION' AS history_kind,
          le.id AS ledger_entry_id,
          t.transaction_id,
          t.transaction_ref,
          le.created_at AS transaction_time,
          le.amount,
          0::numeric AS fee_amount,
          'COMMISSION' AS type_name,
          tt_src.type_name AS source_tx_type_name,
          le.description AS user_note,
          'COMPLETED'::${DB_SCHEMA}.transaction_status AS status,
          NULL::bigint AS sender_profile_id,
          NULL::varchar AS sender_name,
          NULL::varchar AS sender_phone,
          NULL::text AS sender_profile_picture_url,
          w.profile_id AS receiver_profile_id,
          p.full_name AS receiver_name,
          p.phone_number AS receiver_phone,
          p.profile_picture_url AS receiver_profile_picture_url
        FROM ${DB_SCHEMA}.ledger_entries le
        JOIN ${DB_SCHEMA}.wallets w ON le.wallet_id = w.wallet_id
        JOIN ${DB_SCHEMA}.profiles p ON w.profile_id = p.profile_id
        JOIN ${DB_SCHEMA}.transactions t ON le.transaction_id = t.transaction_id
        JOIN ${DB_SCHEMA}.transaction_types tt_src ON t.type_id = tt_src.type_id
        WHERE w.profile_id = $1
          AND le.entry_type = 'CREDIT'
          AND (
            le.description ILIKE 'Commission share%'
            OR le.description ILIKE 'Commission Earned -%'
          )
      )
      SELECT *
      FROM history
      ${whereExtra}
      ORDER BY history.transaction_time DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;

    const countQuery = `
      WITH history AS (
        SELECT
          t.transaction_time,
          tt.type_name
        FROM ${DB_SCHEMA}.transactions t
        JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
        JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
        JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
        WHERE (sw.profile_id = $1 OR rw.profile_id = $1)

        UNION ALL

        SELECT
          le.created_at AS transaction_time,
          'COMMISSION' AS type_name
        FROM ${DB_SCHEMA}.ledger_entries le
        JOIN ${DB_SCHEMA}.wallets w ON le.wallet_id = w.wallet_id
        WHERE w.profile_id = $1
          AND le.entry_type = 'CREDIT'
          AND (
            le.description ILIKE 'Commission share%'
            OR le.description ILIKE 'Commission Earned -%'
          )
      )
      SELECT COUNT(*) AS total
      FROM history
        ${whereExtra}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, params.slice(0, -2)), // exclude limit/offset
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
  async countToday(client, profileId, typeId) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(t.amount), 0)::numeric AS total_amount
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.wallets w ON t.sender_wallet_id = w.wallet_id
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
  async countThisMonth(client, profileId, typeId) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(t.amount), 0)::numeric AS total_amount
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.wallets w ON t.sender_wallet_id = w.wallet_id
       WHERE w.profile_id = $1 AND t.type_id = $2
         AND t.status = 'COMPLETED'
         AND t.transaction_time >= date_trunc('month', CURRENT_DATE)`,
      [profileId, typeId]
    );
    return result.rows[0];
  },


  /**
   * Get last N transactions for mini statement
   */
  async miniStatement(profileId, count = 5) {
    const result = await pool.query(
      `SELECT t.*, tt.type_name,
              sw.profile_id AS sender_profile_id,
              sp.full_name AS sender_name, sp.phone_number AS sender_phone,
              sp.profile_picture_url AS sender_profile_picture_url,
              rw.profile_id AS receiver_profile_id,
              rp.full_name AS receiver_name, rp.phone_number AS receiver_phone,
              rp.profile_picture_url AS receiver_profile_picture_url,
              rp.account_status AS receiver_account_status
       FROM ${DB_SCHEMA}.transactions t
       JOIN ${DB_SCHEMA}.transaction_types tt ON t.type_id = tt.type_id
       JOIN ${DB_SCHEMA}.wallets sw ON t.sender_wallet_id = sw.wallet_id
       JOIN ${DB_SCHEMA}.profiles sp ON sw.profile_id = sp.profile_id
       JOIN ${DB_SCHEMA}.wallets rw ON t.receiver_wallet_id = rw.wallet_id
       JOIN ${DB_SCHEMA}.profiles rp ON rw.profile_id = rp.profile_id
       WHERE (sw.profile_id = $1 OR rw.profile_id = $1)
         AND t.status = 'COMPLETED'
       ORDER BY t.transaction_time DESC
       LIMIT $2`,
      [profileId, count]
    );
    return result.rows;
  },
};

export default transactionModel;
