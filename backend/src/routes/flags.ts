import { Router } from "express";
import { Pool } from "pg";
import { outcomesByGroup } from "../flags/assignment";

export function flagsRouter(pool: Pool): Router {
  const router = Router();

  router.get("/:key/outcomes", async (req, res) => {
    const outcomes = await outcomesByGroup(pool, req.params.key);
    res.json({ flagKey: req.params.key, outcomes });
  });

  return router;
}
