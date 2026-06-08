import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Ensure pgvector extension is enabled
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // We try to create the extension. This requires superuser privileges
    // as noted by the user. If it fails, we log it but continue (it might already exist).
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("pgvector extension ensured.");
  } catch (error) {
    console.error("Warning: Could not ensure pgvector extension:", error);
    console.log("If this is production, please run 'CREATE EXTENSION IF NOT EXISTS vector;' as a superuser.");
  } finally {
    client.release();
  }
}
