const app = require('./src/app');
const env = require('./src/config/env');
const pool = require('./src/config/db');

const startServer = async () => {
  try {
    // Verify database connection
    const client = await pool.connect();
    console.log('[DB] Connected to PostgreSQL successfully');
    client.release();

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`[Server] TekaPakhi API running on port ${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
      console.log(`[Server] Health check: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
