# Deployment status

## Web (Next.js) — live

Deployed to Vercel: **https://tagalong-sonofnos.vercel.app**

Build is a static/edge Next.js deployment (`vercel --prod`), auto-detected
framework, no custom config needed. It renders and the login/signup/browse
screens load.

**Caveat:** the backend is not live (see below), so `NEXT_PUBLIC_API_URL`
on this deployment still points at its default, `http://localhost:4000`.
Every page that calls the API (login, activity list, activity detail) will
fail to fetch in production until a real backend URL is live and that env
var is set on the Vercel project. The deployed site honestly demonstrates
the built UI, not a working end-to-end demo, until that's done.

## Backend (Node/Express) + Postgres + Redis — blocked, not live

Plan was: Docker image on Render, with Postgres and Redis as Render managed
services, same self-migrating-container pattern as other repos in this
portfolio (migrations run against `DATABASE_URL` on container start, see
`backend/src/db.ts`, so no manual DB step is needed at deploy time).

This is blocked on a real account-level constraint, not a credentials or
browser-auth wall: **Render allows only one active free-tier Postgres
database per account**, and that slot is already used by another project
(`agent-platform-db`, in use, not something to repurpose). The CLI (`render
postgres create --plan free`) fails with:

```
Error: received response code 400: cannot have more than one active free tier database
```

The next free-tier Postgres database on this account won't be available
until the existing one's 30-day free-tier window expires on its own, or a
paid plan is used instead. I did not provision a paid database without
checking first, since that's a real money decision, not a technical one.

Render Key Value (Redis) was not blocked the same way (no single-instance
free-tier cap observed), but there's no point standing up Redis and a web
service with no database to point them at, so none of that was created
either. The Dockerfile, docker-compose.yml, and self-migration logic are
all written and proven locally (`docker compose up` + the integration test
suite running against a real Testcontainers Postgres); the only missing
piece for a live backend is a Postgres instance to point `DATABASE_URL` at.

**To finish this once a Postgres slot is available:**

```bash
render postgres create --name tagalong-db --plan free --region oregon --confirm
render keyvalues create --name tagalong-redis --plan free --region oregon --confirm
render services create --name tagalong-backend --type web_service --runtime docker \
  --repo https://github.com/sonofnos/tagalong --root-directory backend \
  --env-var DATABASE_URL=<from postgres create output> \
  --env-var REDIS_URL=<from keyvalues create output> \
  --env-var JWT_SECRET=<a real secret> \
  --confirm
```

Then set `NEXT_PUBLIC_API_URL` on the Vercel project to the resulting
backend URL and redeploy web.

## Mobile (Flutter) — not applicable in the same sense

No backend-hosted "live" deployment target for a mobile app; verification
status is in the main README's "What did not get fully verified" section:
`flutter analyze` and `flutter test` are clean, a full iOS Simulator run
hit an unrelated local Xcode toolchain error.
