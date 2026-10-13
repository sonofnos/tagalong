import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createPool, runMigrations } from "./db";
import { metricsMiddleware, metricsStore } from "./metrics/store";
import { RealtimeHub } from "./realtime/pubsub";
import { authRouter } from "./routes/auth";
import { activitiesRouter } from "./routes/activities";
import { rsvpsRouter } from "./routes/rsvps";
import { activityInvitesRouter, inviteCodesRouter } from "./routes/invites";
import { flagsRouter } from "./routes/flags";

export interface BuildAppOptions {
  databaseUrl?: string;
  jwtSecret?: string;
  redisUrl?: string;
  pool?: ReturnType<typeof createPool>;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET ?? "dev-secret-change-me";
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL;

  let pool = options.pool;
  if (!pool) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    pool = createPool(databaseUrl);
    await runMigrations(pool);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(metricsMiddleware);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: "*" } });

  let hub: RealtimeHub | null = null;
  if (redisUrl) {
    hub = new RealtimeHub(redisUrl, io);
    await hub.start();
  }

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/metrics", (_req, res) => res.json(metricsStore.snapshot()));

  app.use("/auth", authRouter(pool, jwtSecret));
  app.use("/activities", activitiesRouter(pool, jwtSecret));
  app.use("/activities", rsvpsRouter(pool, jwtSecret, hub));
  app.use("/activities", activityInvitesRouter(pool, jwtSecret));
  app.use("/flags", flagsRouter(pool));
  app.use("/invites", inviteCodesRouter(pool, jwtSecret));

  return { app, server, pool, hub };
}

if (require.main === module) {
  buildApp()
    .then(({ server }) => {
      const port = Number(process.env.PORT ?? 4000);
      server.listen(port, () => {
        console.log(JSON.stringify({ type: "startup", port, ts: new Date().toISOString() }));
      });
    })
    .catch((err) => {
      console.error("failed to start server", err);
      process.exit(1);
    });
}
