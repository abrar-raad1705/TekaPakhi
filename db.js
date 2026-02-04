const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "tekapakhi_db",
  user: "postgres",
  password: "raad17",
});

module.exports = pool;
