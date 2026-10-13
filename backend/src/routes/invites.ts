import { Router } from "express";
import { Pool } from "pg";
import crypto from "crypto";
import { AuthedRequest, requireAuth } from "../auth/jwt";

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("hex");
}

// Mounted under /activities. Creates a shareable invite code tied to the
// inviting user, so provenance (who invited whom) is tracked once redeemed.
export function activityInvitesRouter(pool: Pool, jwtSecret: string): Router {
  const router = Router();
  const auth = requireAuth(jwtSecret);

  router.post("/:id/invites", auth, async (req: AuthedRequest, res) => {
    const activityId = req.params.id;
    const code = generateInviteCode();
    const result = await pool.query(
      `INSERT INTO invites (code, activity_id, inviter_id) VALUES ($1, $2, $3) RETURNING *`,
      [code, activityId, req.userId]
    );
    res.status(201).json({ invite: result.rows[0] });
  });

  return router;
}

// Mounted under /invites. Standalone lookup and redemption by code.
export function inviteCodesRouter(pool: Pool, jwtSecret: string): Router {
  const router = Router();
  const auth = requireAuth(jwtSecret);

  router.get("/:code", async (req, res) => {
    const result = await pool.query(
      `SELECT i.*, a.title, a.starts_at, a.location, u.name AS inviter_name
       FROM invites i
       JOIN activities a ON a.id = i.activity_id
       JOIN users u ON u.id = i.inviter_id
       WHERE i.code = $1`,
      [req.params.code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "invite not found" });
    }
    res.json({ invite: result.rows[0] });
  });

  // Redeeming an invite records who accepted it, then the caller still
  // calls the normal RSVP endpoint to actually join.
  router.post("/:code/redeem", auth, async (req: AuthedRequest, res) => {
    const result = await pool.query(
      `UPDATE invites SET invitee_id = $1, used_at = now()
       WHERE code = $2 AND used_at IS NULL
       RETURNING *`,
      [req.userId, req.params.code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "invite not found or already used" });
    }
    res.json({ invite: result.rows[0] });
  });

  return router;
}
