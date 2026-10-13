import { Router } from "express";
import { Pool, PoolClient } from "pg";
import { AuthedRequest, requireAuth } from "../auth/jwt";
import { RealtimeHub } from "../realtime/pubsub";
import { getOrAssignGroup, recordOutcome } from "../flags/assignment";

const WAITLIST_AUTO_PROMOTE_FLAG = "waitlist_auto_promote";

async function attendeeCounts(client: PoolClient | Pool, activityId: string) {
  const res = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
       COUNT(*) FILTER (WHERE status = 'waitlisted')::int AS waitlisted
     FROM rsvps WHERE activity_id = $1`,
    [activityId]
  );
  return { confirmed: res.rows[0].confirmed as number, waitlisted: res.rows[0].waitlisted as number };
}

export function rsvpsRouter(pool: Pool, jwtSecret: string, hub: RealtimeHub | null): Router {
  const router = Router();
  const auth = requireAuth(jwtSecret);

  /**
   * Join an activity. Concurrency safety: the activity row is locked with
   * SELECT ... FOR UPDATE before counting confirmed RSVPs, so concurrent
   * requests for the same activity serialize on that lock instead of all
   * reading a stale count and over-confirming ("check-then-act"). Whoever
   * gets the lock next sees the previous transaction's committed count.
   */
  router.post("/:id/rsvp", auth, async (req: AuthedRequest, res) => {
    const activityId = req.params.id;
    const userId = req.userId!;
    const client = await pool.connect();
    let resultStatus: "confirmed" | "waitlisted";
    let capacity: number;
    try {
      await client.query("BEGIN");

      const activityRes = await client.query(
        "SELECT capacity FROM activities WHERE id = $1 FOR UPDATE",
        [activityId]
      );
      if (activityRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "activity not found" });
      }
      capacity = activityRes.rows[0].capacity as number;

      const existing = await client.query(
        "SELECT status FROM rsvps WHERE activity_id = $1 AND user_id = $2",
        [activityId, userId]
      );
      if (existing.rows.length > 0 && existing.rows[0].status !== "cancelled") {
        resultStatus = existing.rows[0].status;
        await client.query("COMMIT");
      } else {
        const { confirmed } = await attendeeCounts(client, activityId);
        resultStatus = confirmed < capacity ? "confirmed" : "waitlisted";

        await client.query(
          `INSERT INTO rsvps (activity_id, user_id, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (activity_id, user_id)
           DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
          [activityId, userId, resultStatus]
        );
        await client.query("COMMIT");
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const counts = await attendeeCounts(pool, activityId);
    if (hub) {
      await hub.publishAttendeeUpdate({
        activityId,
        confirmedCount: counts.confirmed,
        waitlistedCount: counts.waitlisted,
        capacity,
        reason: "rsvp",
      });
    }

    const group = await getOrAssignGroup(pool, WAITLIST_AUTO_PROMOTE_FLAG, userId);
    await recordOutcome(pool, WAITLIST_AUTO_PROMOTE_FLAG, userId, group, "rsvp_completed");

    res.status(200).json({ status: resultStatus, group });
  });

  /**
   * Cancel an RSVP. When the cancelling user was confirmed, whether the next
   * waitlisted person is auto-promoted depends on the cancelling user's
   * feature-flag group for waitlist_auto_promote: treatment auto-promotes,
   * holdout leaves the waitlist untouched (the pre-feature behavior), so the
   * two groups' outcomes are directly comparable.
   */
  router.post("/:id/rsvp/cancel", auth, async (req: AuthedRequest, res) => {
    const activityId = req.params.id;
    const userId = req.userId!;
    const client = await pool.connect();
    let promoted: string | null = null;
    try {
      await client.query("BEGIN");
      await client.query("SELECT capacity FROM activities WHERE id = $1 FOR UPDATE", [activityId]);

      const existing = await client.query(
        "SELECT status FROM rsvps WHERE activity_id = $1 AND user_id = $2",
        [activityId, userId]
      );
      if (existing.rows.length === 0 || existing.rows[0].status === "cancelled") {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "no active rsvp for this user" });
      }
      const wasConfirmed = existing.rows[0].status === "confirmed";

      await client.query(
        "UPDATE rsvps SET status = 'cancelled', updated_at = now() WHERE activity_id = $1 AND user_id = $2",
        [activityId, userId]
      );

      if (wasConfirmed) {
        const group = await getOrAssignGroup(pool, WAITLIST_AUTO_PROMOTE_FLAG, userId);
        if (group === "treatment") {
          const next = await client.query(
            `SELECT user_id FROM rsvps
             WHERE activity_id = $1 AND status = 'waitlisted'
             ORDER BY created_at ASC
             LIMIT 1
             FOR UPDATE`,
            [activityId]
          );
          if (next.rows.length > 0) {
            promoted = next.rows[0].user_id as string;
            await client.query(
              "UPDATE rsvps SET status = 'confirmed', updated_at = now() WHERE activity_id = $1 AND user_id = $2",
              [activityId, promoted]
            );
          }
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const counts = await attendeeCounts(pool, activityId);
    const activityRes = await pool.query("SELECT capacity FROM activities WHERE id = $1", [activityId]);
    if (hub) {
      await hub.publishAttendeeUpdate({
        activityId,
        confirmedCount: counts.confirmed,
        waitlistedCount: counts.waitlisted,
        capacity: activityRes.rows[0]?.capacity ?? 0,
        reason: promoted ? "auto_promote" : "cancel",
      });
    }

    res.json({ cancelled: true, promotedUserId: promoted });
  });

  return router;
}
