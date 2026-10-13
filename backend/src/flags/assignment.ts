import crypto from "crypto";
import { Pool } from "pg";

export type FlagGroup = "treatment" | "holdout";

/**
 * Deterministic bucket for a (flagKey, userId) pair: sha256(flagKey:userId),
 * first 4 bytes as an unsigned int, mod 100. Same flag + same user always
 * lands in the same bucket, independent of call order or process restarts,
 * without needing to hit the DB to find out which side of the line it's on.
 */
export function bucketFor(flagKey: string, userId: string): number {
  const hash = crypto
    .createHash("sha256")
    .update(`${flagKey}:${userId}`)
    .digest();
  const n = hash.readUInt32BE(0);
  return n % 100;
}

export function groupFor(
  flagKey: string,
  userId: string,
  rolloutPct: number
): FlagGroup {
  return bucketFor(flagKey, userId) < rolloutPct ? "treatment" : "holdout";
}

/**
 * Returns the user's group for a flag, persisting the assignment the first
 * time it is computed so later reads (and analysis queries) are stable even
 * if rollout_pct changes afterwards.
 */
export async function getOrAssignGroup(
  pool: Pool,
  flagKey: string,
  userId: string
): Promise<FlagGroup> {
  const existing = await pool.query(
    "SELECT group_name FROM flag_assignments WHERE flag_key = $1 AND user_id = $2",
    [flagKey, userId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].group_name as FlagGroup;
  }

  const flagRes = await pool.query(
    "SELECT rollout_pct FROM feature_flags WHERE key = $1",
    [flagKey]
  );
  if (flagRes.rows.length === 0) {
    throw new Error(`unknown feature flag: ${flagKey}`);
  }
  const rolloutPct = flagRes.rows[0].rollout_pct as number;
  const group = groupFor(flagKey, userId, rolloutPct);

  const inserted = await pool.query(
    `INSERT INTO flag_assignments (flag_key, user_id, group_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (flag_key, user_id) DO NOTHING
     RETURNING group_name`,
    [flagKey, userId, group]
  );
  if (inserted.rows.length > 0) {
    return inserted.rows[0].group_name as FlagGroup;
  }
  // Lost a race with a concurrent assignment of the same user; read it back.
  const resolved = await pool.query(
    "SELECT group_name FROM flag_assignments WHERE flag_key = $1 AND user_id = $2",
    [flagKey, userId]
  );
  return resolved.rows[0].group_name as FlagGroup;
}

export async function recordOutcome(
  pool: Pool,
  flagKey: string,
  userId: string,
  group: FlagGroup,
  eventName: string
): Promise<void> {
  await pool.query(
    `INSERT INTO flag_events (flag_key, user_id, group_name, event_name)
     VALUES ($1, $2, $3, $4)`,
    [flagKey, userId, group, eventName]
  );
}

export interface GroupOutcome {
  group: FlagGroup;
  eventName: string;
  count: number;
}

export async function outcomesByGroup(
  pool: Pool,
  flagKey: string
): Promise<GroupOutcome[]> {
  const res = await pool.query(
    `SELECT group_name AS group, event_name AS "eventName", COUNT(*)::int AS count
     FROM flag_events
     WHERE flag_key = $1
     GROUP BY group_name, event_name
     ORDER BY group_name, event_name`,
    [flagKey]
  );
  return res.rows;
}
