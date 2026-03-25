import pool from '../config/db.js';

const securityLogModel = {
  async create({ profileId, eventType, ipAddress, userAgent, deviceInfo, metadata }) {
    const result = await pool.query(
      `INSERT INTO tp.security_logs (profile_id, event_type, ip_address, user_agent, device_info, metadata)
       VALUES ($1, $2, $3::inet, $4, $5, $6)
       RETURNING *`,
      [profileId ?? null, eventType, ipAddress ?? null, userAgent ?? null, deviceInfo ?? '{}', metadata ?? '{}'],
    );
    return result.rows[0];
  },

  async findAll({ page = 1, limit = 25, eventType, profileId, startDate, endDate } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (eventType) {
      conditions.push(`sl.event_type = $${idx++}`);
      params.push(eventType);
    }
    if (profileId) {
      conditions.push(`sl.profile_id = $${idx++}`);
      params.push(profileId);
    }
    if (startDate) {
      conditions.push(`sl.created_at >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`sl.created_at <= $${idx++}`);
      params.push(endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM tp.security_logs sl ${where}`,
      params,
    );

    const dataRes = await pool.query(
      `SELECT sl.*, p.phone_number, p.full_name, pt.type_name
       FROM tp.security_logs sl
       LEFT JOIN tp.profiles p ON sl.profile_id = p.profile_id
       LEFT JOIN tp.profile_types pt ON p.type_id = pt.type_id
       ${where}
       ORDER BY sl.created_at DESC
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

export default securityLogModel;
