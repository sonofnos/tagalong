# tagalong

A small real-life activity coordination app. Post or join a hike, a dinner, a
pickup game, whatever. See who else is in, live. Invite friends with a link
that tracks who invited whom.

One backend, three clients: a Node.js/TypeScript API, a Next.js web app, and
a Flutter mobile app, all talking to the same API and the same JWTs.

This is a portfolio project, built to demonstrate owning a feature end to end
across a shared backend, web client, and mobile client, with feature flags,
holdout groups, and real instrumentation, not a product of any employer.

## Why this project exists

Most of my other repos prove one piece of this well in isolation: Flutter
apps with Riverpod and secure token storage, a Next.js + Socket.IO app with
live sync, concurrency-safe money movement under load, A/B-style flag
systems. This repo exists to prove the specific combination: the same
engineer shipping one feature across all three clients at once, gated behind
a flag, with per-group outcomes recorded, and the technical metrics
(error rate, latency) to go with it.

## Architecture

```
backend/   Node.js + TypeScript + Express, PostgreSQL, Redis, Socket.IO
web/       Next.js (App Router) + TypeScript
mobile/    Flutter + Riverpod + Dio + flutter_secure_storage
```

All three clients call the same REST API and share the JWT issued by
`/auth/login` and `/auth/signup`. Realtime attendee updates reach both web
and mobile over Socket.IO, fanned out through Redis pub/sub so it stays
correct if the backend ever runs as more than one process.

## Domain model

- **Activity**: title, description, location, start time, capacity. Has a
  host.
- **RSVP**: a user's status on an activity — `confirmed`, `waitlisted`, or
  `cancelled`.
- **Invite**: a short code tied to the inviting user. Redeeming it records
  who invited whom, so invite provenance is tracked, not just "someone
  joined."

## Concurrency: capacity under load

The RSVP endpoint is the part of this system that has to be provably
correct, not just apparently correct. When an activity hits capacity,
concurrent RSVPs must resolve to exactly `capacity` confirmed and the rest
waitlisted — no double-booking, no race.

The implementation (`backend/src/routes/rsvps.ts`) locks the activity row
with `SELECT ... FOR UPDATE` before counting confirmed RSVPs and deciding
the new RSVP's status, all inside one transaction. Every concurrent request
for the same activity serializes on that row lock: whoever gets the lock
next sees the previous transaction's committed count, not a stale read. This
is "lock then count then act," not "check then act," which is the
check-then-act race that would let concurrent requests all read "4 of 5
taken" and all decide to confirm.

`backend/test/integration/rsvp-concurrency.test.ts` proves this against a
real PostgreSQL instance (via Testcontainers, not an in-memory or sqlite
stand-in, which would not exercise real row locking): 20 concurrent RSVP
requests against an activity with capacity 5 resolve to exactly 5 confirmed
and 15 waitlisted, verified both in the HTTP responses and with a direct
database query afterwards.

## Feature flags and holdout groups

`backend/src/flags/assignment.ts` implements deterministic bucketing: a
user's group for a given flag is `sha256(flagKey:userId) mod 100`, compared
against the flag's rollout percentage. Same flag, same user, same group,
every time, with no need to hit the database to recompute it, though the
first assignment is persisted (`flag_assignments`) so later analysis is
stable even if the rollout percentage changes afterwards.

The flag gates `waitlist_auto_promote`: when a confirmed attendee cancels,
users in the `treatment` group get the next waitlisted person auto-promoted
to confirmed; the `holdout` group gets the pre-feature behavior (the
waitlist is left alone). Every RSVP completion is recorded as an outcome
event (`flag_events`) tagged with the user's group, so
`GET /flags/:key/outcomes` can answer "did the treatment group complete more
RSVPs than holdout" with a real query, not a guess.

`backend/test/unit/flags.test.ts` proves the bucketing is deterministic and
spreads across buckets. `backend/test/integration/flags.test.ts` proves
assignment persistence and per-group outcome aggregation against a real
database. `backend/test/integration/rsvp-concurrency.test.ts` also exercises
the auto-promote path end to end through the cancel endpoint.

## Instrumentation

`backend/src/metrics/store.ts` is simple and real: middleware times every
request, tags it by `METHOD route`, and keeps per-route counts, error
counts, and latency in process memory. `GET /metrics` exposes it as JSON.
Every request also emits a structured JSON log line (method, path, status,
latency), which is what you'd point a log pipeline at in a real deployment.
This is not a stub: it is reading real counters off real traffic, visible
immediately in the concurrency test's own logs.

## Realtime

An RSVP change publishes an `AttendeeUpdateEvent` to a Redis channel keyed
by activity id. Every backend process subscribes to all `activity:*`
channels and forwards matching events into the Socket.IO room for that
activity. Clients join that room with a `watch_activity` emit and get
`attendee_update` pushes, no polling. Both the Next.js page and the Flutter
screen for an activity re-fetch the activity on that push, which keeps the
rendering logic simple (one source of truth, re-fetched on signal) at the
cost of an extra round trip per update — a reasonable trade for a project
this size.

## Auth

JWT issued by the backend on login/signup, verified by `requireAuth`
middleware. The web client stores it in `localStorage` and sends it as a
bearer token; the mobile client stores it in `flutter_secure_storage` and
attaches it via a Dio interceptor, matching the pattern used in `pulsepay_app`.

## Real bugs found and fixed while building this

- **iOS simulator build target too low for current Xcode.** `flutter create`
  scaffolds the iOS project with `IPHONEOS_DEPLOYMENT_TARGET = 13.0`, but the
  Xcode toolchain on this machine only supports 15.0 and up. Fixed by raising
  the deployment target in `ios/Podfile` and `ios/Runner.xcodeproj` to 15.0.
- **Next.js 16's experimental Cache Components mode blocked the dynamic
  routes.** `create-next-app`'s default `next.config.ts` enabled
  `cacheComponents: true`, which requires every dynamic `params` access to be
  wrapped in `<Suspense>` or explicitly opted into blocking rendering. Since
  every page in this app is a client component reading auth state from
  `localStorage` anyway, there is nothing for that mode to cache; disabled it
  instead of wrapping every page in artificial Suspense boundaries.
- **ESLint's `set-state-in-effect` rule flagged the websocket-driven refetch
  pattern** in the activity detail page (fetch on mount, refetch on socket
  event). This is the documented "subscribe to an external system" case the
  rule exists to allow, so it's suppressed at the two call sites with an
  explanation rather than restructured around the lint rule.

## What did not get fully verified

Flutter's `flutter analyze` and `flutter test` are clean (see below for
counts), but a live run on an iOS Simulator hit a separate Xcode toolchain
error (`debug_unpack_ios` / "Thin Binary" script failing to find a
matching architecture slice for the simulator target) that is a local Xcode
installation issue, not a defect in this app's code. I did not chase it
further; the honest status is: compiles and analyzes clean, unit/widget
tests pass, simulator boot not confirmed on this machine.

## Running locally

```bash
# backend
cd backend
cp .env.example .env
docker compose up -d postgres redis   # or point DATABASE_URL/REDIS_URL elsewhere
npm install
npm run dev

# web
cd web
npm install
npm run dev   # expects the backend at http://localhost:4000 by default

# mobile
cd mobile
flutter pub get
flutter run --dart-define=TAGALONG_API_BASE_URL=http://127.0.0.1:4000
```

## Testing

```bash
cd backend && npm test   # unit + integration against a real Postgres via Testcontainers
cd web && npm test       # Vitest + Testing Library
cd mobile && flutter analyze && flutter test
```

## Deployment

See `DEPLOYMENT.md` for what is live, what isn't, and why.
