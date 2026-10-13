import { Pool } from "pg";
import fs from "fs";
import path from "path";

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 20 });
}

/**
 * Runs every .sql file in migrations/ in filename order, once each, tracked
 * in a schema_migrations table. Safe to call on every container start so the
 * backend self-migrates against DATABASE_URL with no manual DB step.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const dir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file]
    );
    if (rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        file,
      ]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
