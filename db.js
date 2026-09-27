import pg from "pg";

const { Pool } = pg;

// Reads DATABASE_URL from environment, or falls back to individual vars.
// Set DATABASE_URL in your .env (or environment) before starting the server.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If DATABASE_URL is not set, pg will use PGHOST / PGPORT / PGUSER /
  // PGPASSWORD / PGDATABASE environment variables automatically.
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

export default pool;
