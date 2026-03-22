const pool = require('../config/db');

const recipientModel = {
<<<<<<< Updated upstream
  async findBySaver(saverProfileId) {
    const result = await pool.query(
      `SELECT sr.*, p.full_name AS target_name, p.phone_number AS target_phone, pt.type_name AS target_type
=======
  async findBySaver(saverProfileId, client = pool) {
    const result = await client.query(
      `SELECT sr.*, p.full_name AS target_name, p.phone_number AS target_phone,
              p.profile_picture_url AS target_profile_picture_url,
              pt.type_name AS target_type
>>>>>>> Stashed changes
       FROM tp.saved_recipients sr
       JOIN tp.profiles p ON sr.target_profile_id = p.profile_id
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE sr.saver_profile_id = $1
       ORDER BY sr.added_date DESC`,
      [saverProfileId]
    );
    return result.rows;
  },

  async create(saverProfileId, targetProfileId, nickname, client = pool) {
    const result = await client.query(
      `INSERT INTO tp.saved_recipients (saver_profile_id, target_profile_id, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT (saver_profile_id, target_profile_id) DO UPDATE SET nickname = $3
       RETURNING *`,
      [saverProfileId, targetProfileId, nickname]
    );
    return result.rows[0];
  },

  async delete(recipientId, saverProfileId, client = pool) {
    const result = await client.query(
      `DELETE FROM tp.saved_recipients
       WHERE recipient_id = $1 AND saver_profile_id = $2
       RETURNING *`,
      [recipientId, saverProfileId]
    );
    return result.rows[0] || null;
  },
};

<<<<<<< Updated upstream
module.exports = recipientModel;
=======
export default recipientModel;

>>>>>>> Stashed changes
