import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestPool, teardownTestPool, createTestUser } from "./setup";
import { getOrAssignGroup, recordOutcome, outcomesByGroup } from "../../src/flags/assignment";

describe("feature flag assignment and outcome recording against a real database", () => {
  afterAll(async () => {
    await teardownTestPool();
  });

  it("persists the assignment on first lookup and returns the same group afterwards", async () => {
    const pool = await getTestPool();
    const userId = await createTestUser(pool, `flaguser-${Date.now()}@test.local`);

    const first = await getOrAssignGroup(pool, "waitlist_auto_promote", userId);
    const second = await getOrAssignGroup(pool, "waitlist_auto_promote", userId);
    expect(first).toBe(second);

    const row = await pool.query(
      "SELECT group_name FROM flag_assignments WHERE flag_key = $1 AND user_id = $2",
      ["waitlist_auto_promote", userId]
    );
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].group_name).toBe(first);
  });

  it("records outcome events and aggregates them per group", async () => {
    const pool = await getTestPool();
    const flagKey = `test-flag-${Date.now()}`;
    await pool.query(
      "INSERT INTO feature_flags (key, description, rollout_pct) VALUES ($1, 'test', 50)",
      [flagKey]
    );

    const userA = await getTestUserForGroup(pool, flagKey, "treatment");
    const userB = await getTestUserForGroup(pool, flagKey, "holdout");

    await recordOutcome(pool, flagKey, userA, "treatment", "rsvp_completed");
    await recordOutcome(pool, flagKey, userA, "treatment", "rsvp_completed");
    await recordOutcome(pool, flagKey, userB, "holdout", "rsvp_completed");

    const outcomes = await outcomesByGroup(pool, flagKey);
    const treatmentCount = outcomes.find(
      (o) => o.group === "treatment" && o.eventName === "rsvp_completed"
    )?.count;
    const holdoutCount = outcomes.find(
      (o) => o.group === "holdout" && o.eventName === "rsvp_completed"
    )?.count;

    expect(treatmentCount).toBe(2);
    expect(holdoutCount).toBe(1);
  });
});

async function getTestUserForGroup(
  pool: Awaited<ReturnType<typeof getTestPool>>,
  flagKey: string,
  wantedGroup: "treatment" | "holdout"
): Promise<string> {
  for (let i = 0; i < 2000; i++) {
    const userId = await createTestUser(pool, `grp-${flagKey}-${i}-${Date.now()}@test.local`);
    const group = await getOrAssignGroup(pool, flagKey, userId);
    if (group === wantedGroup) return userId;
  }
  throw new Error(`could not find a user landing in ${wantedGroup} for ${flagKey}`);
}
