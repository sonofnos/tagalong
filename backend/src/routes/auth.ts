import { Router } from "express";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { signToken } from "../auth/jwt";

export function authRouter(pool: Pool, jwtSecret: string): Router {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const { email, password, name } = req.body ?? {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, name are required" });
    }
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, passwordHash, name]
    );
    const user = result.rows[0];
    const token = signToken(user.id, jwtSecret);
    res.status(201).json({ token, user });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const result = await pool.query(
      "SELECT id, email, name, password_hash FROM users WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const token = signToken(user.id, jwtSecret);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  return router;
}
