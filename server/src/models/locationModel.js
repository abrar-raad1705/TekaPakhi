import pool, { DB_SCHEMA } from '../config/db.js';

const locationModel = {
  async listDistricts() {
    const result = await pool.query(
      `SELECT DISTINCT district FROM ${DB_SCHEMA}.locations ORDER BY district ASC`
    );
    return result.rows.map((r) => r.district);
  },

  async listAreasByDistrict(district) {
    const result = await pool.query(
      `SELECT area FROM ${DB_SCHEMA}.locations WHERE district = $1 ORDER BY area ASC`,
      [district]
    );
    return result.rows.map((r) => r.area);
  },

  async isValidPair(district, area) {
    const result = await pool.query(
      `SELECT 1 FROM ${DB_SCHEMA}.locations WHERE district = $1 AND area = $2 LIMIT 1`,
      [district, area]
    );
    return result.rows.length > 0;
  },

  async isAreaTakenByOther(district, area, excludeProfileId) {
    const result = await pool.query(
      `SELECT profile_id FROM ${DB_SCHEMA}.distributor_areas WHERE district = $1 AND area = $2 AND profile_id <> $3 LIMIT 1`,
      [district, area, excludeProfileId]
    );
    return result.rows.length > 0;
  },

  async isAreaTaken(district, area) {
    const result = await pool.query(
      `SELECT profile_id FROM ${DB_SCHEMA}.distributor_areas WHERE district = $1 AND area = $2 LIMIT 1`,
      [district, area]
    );
    return result.rows.length > 0;
  },
};

export default locationModel;
