import app from "./src/app.js";
import env from "./src/config/env.js";
import pool from "./src/config/db.js";

const startServer = async () => {
  try {
    // Verify database connection
    const client = await pool.connect();
    console.log("[DB] Connected to PostgreSQL successfully");
    client.release();

    // Start Express server
    app.listen(env.PORT, "0.0.0.0", () => {
      console.log(`[Server] API running on port ${env.PORT}`);
      console.log(`[Server] Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
