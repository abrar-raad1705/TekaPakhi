import pool, { DB_SCHEMA } from './src/config/db.js';

async function check() {
  try {
    const res = await pool.query('SELECT current_database(), current_schema()');
    console.log('Database:', res.rows[0].current_database);
    console.log('Schema:', DB_SCHEMA);
    console.log('Current search_path:', (await pool.query('SHOW search_path')).rows[0].search_path);

    const agentRes = await pool.query(
      `SELECT p.phone_number, w.balance 
       FROM ${DB_SCHEMA}.profiles p 
       JOIN ${DB_SCHEMA}.wallets w ON p.profile_id = w.profile_id 
       WHERE p.type_id = 2`
    );
    console.log('Agents defined in this DB/Schema:');
    console.table(agentRes.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
