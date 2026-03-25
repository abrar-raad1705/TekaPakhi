import app from "./src/app.js";
import env from "./src/config/env.js";
import pool from "./src/config/db.js";
import logger from "./src/config/logger.js";

const startServer = async () => {
  try {
    const client = await pool.connect();
    logger.info("Connected to PostgreSQL successfully");
    client.release();

    app.listen(env.PORT, "0.0.0.0", () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, "API server started");
    });
  } catch (error) {
    logger.fatal({ err: error }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
