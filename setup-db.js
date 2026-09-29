import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

async function setup() {
  console.log("Starting database setup...");
  console.log("Connecting to:", process.env.DATABASE_URL?.replace(/:\/\/.*@/, "://<credentials>@"));

  // For cloud providers (Neon, Supabase, Render, Railway), the database
  // already exists — just connect directly and apply the schema.
  const ssl =
    process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl,
  });

  try {
    await client.connect();
    console.log("✅ Connected to the database. Applying schema...");

    const schemaSql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    await client.query(schemaSql);

    console.log("✅ Schema applied and seed data inserted successfully!");
    console.log("👉 You can now start your server with: npm run dev");
  } catch (err) {
    console.error("❌ Error during setup:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup();

