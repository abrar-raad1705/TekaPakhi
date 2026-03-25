import pkg from 'pg';
const { Pool } = pkg;
import env from './env.js';
import logger from './logger.js';

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
});

pool.on('connect', () => {
  logger.debug('DB client connected to PostgreSQL');
});

pool.on('error', (err) => {
  logger.fatal({ err }, 'Unexpected error on idle DB client');
  process.exit(1);
});

export default pool;
