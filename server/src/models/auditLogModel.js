import pool from '../config/db.js';

const auditLogModel = {
  async create({ eventType, actorId, actorType, summary, details, relatedTransactionId }) {
    const result = await pool.query(
      `INSERT INTO tp.audit_logs (event_type, actor_id, actor_type, summary, details, related_transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventType, actorId ?? null, actorType ?? null, summary, details ?? '{}', relatedTransactionId ?? null],
    );
    return result.rows[0];
  },

  async findAll({ page = 1, limit = 25, eventType, actorType, startDate, endDate } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (eventType) {
      conditions.push(`al.event_type = $${idx++}`);
      params.push(eventType);
    }
    if (actorType) {
      conditions.push(`al.actor_type = $${idx++}`);
      params.push(actorType);
    }
    if (startDate) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`al.created_at <= $${idx++}`);
      params.push(endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM tp.audit_logs al ${where}`,
      params,
    );

    const dataRes = await pool.query(
      `SELECT al.*, p.phone_number AS actor_phone, p.full_name AS actor_name
       FROM tp.audit_logs al
       LEFT JOIN tp.profiles p ON al.actor_id = p.profile_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      data: dataRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
      page,
      limit,
    };
  },
};

export default auditLogModel;
