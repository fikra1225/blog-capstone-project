import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

async function setup() {
  console.log("Starting database setup...");

  // Parse the DATABASE_URL to get credentials
  // For example: postgresql://postgres:Fikra2511!@localhost:5432/blog_db
  const dbUrl = new URL(process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/blog_db");
  const dbName = dbUrl.pathname.replace("/", "");

  // 1. Connect to the default 'postgres' database to create our new database
  const defaultClient = new Client({
    user: dbUrl.username,
    password: dbUrl.password,
    host: dbUrl.hostname,
    port: dbUrl.port,
    database: "postgres", // Connect to default db first
  });

  try {
    await defaultClient.connect();
    
    // Check if the database already exists
    const res = await defaultClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    
    if (res.rowCount === 0) {
      console.log(`Creating database "${dbName}"...`);
      await defaultClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully!`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error("Error connecting to PostgreSQL. Is PostgreSQL installed and running?");
    console.error(err.message);
    process.exit(1);
  } finally {
    await defaultClient.end();
  }

  // 2. Connect to our new 'blog_db' and run the schema
  const blogClient = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await blogClient.connect();
    console.log("Connected to the blog database. Running schema...");
    
    const schemaSql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    await blogClient.query(schemaSql);
    
    console.log("Schema applied and seed data inserted successfully!");
    console.log("You can now start your server with: npm run dev");
  } catch (err) {
    console.error("Error running schema:", err.message);
  } finally {
    await blogClient.end();
  }
}

setup();
