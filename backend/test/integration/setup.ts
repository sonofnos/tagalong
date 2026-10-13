import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { runMigrations } from "../../src/db";

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;

export async function getTestPool(): Promise<Pool> {
  if (pool) return pool;
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  pool = new Pool({ connectionString: container.getConnectionUri(), max: 30 });
  await runMigrations(pool);
  return pool;
}

export async function teardownTestPool(): Promise<void> {
  await pool?.end();
  await container?.stop();
  pool = undefined;
  container = undefined;
}

export async function createTestUser(pool: Pool, email: string): Promise<string> {
  const res = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, 'x', $2) RETURNING id`,
    [email, email]
  );
  return res.rows[0].id as string;
}

export async function createTestActivity(
  pool: Pool,
  hostId: string,
  capacity: number
): Promise<string> {
  const res = await pool.query(
    `INSERT INTO activities (host_id, title, location, starts_at, capacity)
     VALUES ($1, 'Test hike', 'Ngong Hills', now() + interval '1 day', $2)
     RETURNING id`,
    [hostId, capacity]
  );
  return res.rows[0].id as string;
}
