import pool from '../config/db.js';

const adminActionLogModel = {
  async create({ adminId, action, targetProfileId, targetEntity, amount, reason, metadata, ipAddress }) {
    const result = await pool.query(
      `INSERT INTO tp.admin_action_logs
         (admin_id, action, target_profile_id, target_entity, amount, reason, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet)
       RETURNING *`,
      [adminId, action, targetProfileId ?? null, targetEntity ?? null, amount ?? null, reason ?? null, metadata ?? '{}', ipAddress ?? null],
    );
    return result.rows[0];
  },

  async findAll({ page = 1, limit = 25, action, adminId, startDate, endDate } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (action) {
      conditions.push(`al.action = $${idx++}`);
      params.push(action);
    }
    if (adminId) {
      conditions.push(`al.admin_id = $${idx++}`);
      params.push(adminId);
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
      `SELECT COUNT(*) FROM tp.admin_action_logs al ${where}`,
      params,
    );

    const dataRes = await pool.query(
      `SELECT al.*, p.phone_number AS target_phone, p.full_name AS target_name, pt.type_name AS target_type
       FROM tp.admin_action_logs al
       LEFT JOIN tp.profiles p ON al.target_profile_id = p.profile_id
       LEFT JOIN tp.profile_types pt ON p.type_id = pt.type_id
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

export default adminActionLogModel;
