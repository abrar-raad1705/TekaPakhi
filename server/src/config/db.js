import pkg from "pg";
const { Pool } = pkg;
import env from "./env.js";

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
});

pool.on("connect", (client) => {
  client.query(`SET search_path TO ${env.DB_SCHEMA}`);
});

pool.on("error", (err) => {
  console.error("[FATAL] Unexpected error on idle DB client:", err);
  process.exit(1);
});

export const DB_SCHEMA = env.DB_SCHEMA;
export default pool;
