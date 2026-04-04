import app from "./src/app.js";
import env from "./src/config/env.js";
import pool from "./src/config/db.js";

const startServer = async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL successfully");
    client.release();

    app.listen(env.PORT, "0.0.0.0", () => {
      console.log(`API server started on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
