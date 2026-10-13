import { Router } from "express";
import { Pool } from "pg";
import { AuthedRequest, requireAuth } from "../auth/jwt";

export function activitiesRouter(pool: Pool, jwtSecret: string): Router {
  const router = Router();
  const auth = requireAuth(jwtSecret);

  router.get("/", async (_req, res) => {
    const result = await pool.query(
      `SELECT a.id, a.title, a.description, a.location, a.starts_at, a.capacity,
              a.host_id, u.name AS host_name,
              COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS confirmed_count
       FROM activities a
       JOIN users u ON u.id = a.host_id
       LEFT JOIN rsvps r ON r.activity_id = a.id
       GROUP BY a.id, u.name
       ORDER BY a.starts_at ASC`
    );
    res.json({ activities: result.rows });
  });

  router.get("/:id", async (req, res) => {
    const activityRes = await pool.query(
      `SELECT a.*, u.name AS host_name FROM activities a
       JOIN users u ON u.id = a.host_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (activityRes.rows.length === 0) {
      return res.status(404).json({ error: "activity not found" });
    }
    const rsvpsRes = await pool.query(
      `SELECT r.id, r.status, r.user_id, u.name
       FROM rsvps r JOIN users u ON u.id = r.user_id
       WHERE r.activity_id = $1 AND r.status != 'cancelled'
       ORDER BY r.created_at ASC`,
      [req.params.id]
    );
    res.json({ activity: activityRes.rows[0], rsvps: rsvpsRes.rows });
  });

  router.post("/", auth, async (req: AuthedRequest, res) => {
    const { title, description, location, startsAt, capacity } = req.body ?? {};
    if (!title || !location || !startsAt || !capacity) {
      return res
        .status(400)
        .json({ error: "title, location, startsAt, capacity are required" });
    }
    if (Number(capacity) <= 0) {
      return res.status(400).json({ error: "capacity must be positive" });
    }
    const result = await pool.query(
      `INSERT INTO activities (host_id, title, description, location, starts_at, capacity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, title, description ?? "", location, startsAt, capacity]
    );
    res.status(201).json({ activity: result.rows[0] });
  });

  return router;
}
