import { describe, it, expect } from "vitest";
import { bucketFor, groupFor } from "../../src/flags/assignment";

describe("feature flag bucketing", () => {
  it("is deterministic for the same flag and user across repeated calls", () => {
    const first = bucketFor("waitlist_auto_promote", "user-123");
    const second = bucketFor("waitlist_auto_promote", "user-123");
    const third = bucketFor("waitlist_auto_promote", "user-123");
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("produces a bucket in [0, 100)", () => {
    for (const userId of ["a", "b", "c", "some-uuid-1234", ""]) {
      const bucket = bucketFor("flag", userId);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    }
  });

  it("differs between unrelated users often enough to spread across buckets", () => {
    const buckets = new Set<number>();
    for (let i = 0; i < 500; i++) {
      buckets.add(bucketFor("flag", `user-${i}`));
    }
    // With 500 distinct users across 100 buckets we expect broad spread,
    // not everyone landing in the same handful of buckets.
    expect(buckets.size).toBeGreaterThan(50);
  });

  it("assigns the same user to the same group every time at a fixed rollout", () => {
    const groups = new Set<string>();
    for (let i = 0; i < 20; i++) {
      groups.add(groupFor("flag", "stable-user", 50));
    }
    expect(groups.size).toBe(1);
  });

  it("respects rollout_pct as an approximate split across many users", () => {
    let treatment = 0;
    const total = 2000;
    for (let i = 0; i < total; i++) {
      if (groupFor("rollout-flag", `user-${i}`, 30) === "treatment") treatment++;
    }
    const ratio = treatment / total;
    // sha256-based bucketing should track the configured 30% within a wide
    // tolerance for this sample size; this is a sanity check, not a precise
    // statistical test.
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.4);
  });

  it("gives different flags independent assignments for the same user", () => {
    // Not asserting a specific relationship, just that the two flags don't
    // always agree (which would indicate the hash ignores the flag key).
    let sameCount = 0;
    const samples = 100;
    for (let i = 0; i < samples; i++) {
      const userId = `user-${i}`;
      const a = groupFor("flag-a", userId, 50);
      const b = groupFor("flag-b", userId, 50);
      if (a === b) sameCount++;
    }
    expect(sameCount).toBeLessThan(samples);
  });
});
