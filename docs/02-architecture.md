# TransitFlow — System Architecture

**Status:** Draft v1 — pending approval

## 1. Design principle

Build the full-scale architecture's *shape* now (so nothing has to be rewritten later), but implement only the MVP slice of it. Every service below is a real folder with a real interface; most of them start as thin stubs.

## 2. Environment reality check (as of 2026-07-27)

| Tool | Status on this machine |
|---|---|
| Node.js / npm | Installed (v24.18, npm 11.16) |
| Git | Installed |
| Docker | **Not installed** |
| Python | **Not installed** |
| PostgreSQL | **Not installed** (no local server) |
| Redis | **Not installed** |

MVP architecture is chosen to minimize new infra installs: SQLite (via Prisma) for local dev instead of Postgres+Docker, in-memory pub/sub instead of Redis, until you decide to install Docker Desktop. Postgres/Redis remain the target for Phase 2+ — the schema and code are written against Prisma/ioredis abstractions so the swap is a config change, not a rewrite.

## 3. High-level component diagram

```
                        ┌─────────────────────┐
                        │   apps/web (rider)   │
                        │   Next.js + Mapbox   │
                        └──────────┬───────────┘
                                   │ REST + WebSocket
┌───────────────┐        ┌────────▼────────┐        ┌──────────────────┐
│ apps/driver    │◄──────►│  services/api   │◄──────►│ apps/dispatcher   │
│ (Phase 2)      │  WS    │  (NestJS)       │  WS    │ (Phase 2)         │
└───────────────┘        └────────┬────────┘        └──────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
     ┌────────▼───────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
     │ services/       │  │ services/         │  │ services/         │
     │ simulation      │  │ gps (Phase 2+,    │  │ notifications     │
     │ (MVP: fake      │  │ real feed adapter)│  │ (Phase 2, FCM)    │
     │ vehicle engine) │  │                   │  │                   │
     └────────┬────────┘  └───────────────────┘  └───────────────────┘
              │  publishes vehicle position events
     ┌────────▼────────┐
     │  Event bus       │   MVP: in-process EventEmitter / Socket.IO room
     │  (Phase 2: Redis │
     │  pub/sub)        │
     └────────┬────────┘
              │
     ┌────────▼────────┐
     │  PostgreSQL       │   MVP: SQLite via same Prisma schema
     │  (Prisma ORM)     │
     └───────────────────┘
```

`services/payments` (Stripe), `services/ai` (prediction engine) are Phase 2/3 stubs with defined interfaces but no logic yet.

## 4. Realtime data flow (the core mechanic)

1. `services/simulation` runs a tick loop (~1s) that advances every simulated vehicle along its route polyline, applying randomized speed/traffic/delay factors.
2. Each tick emits a `VehiclePositionUpdated` event per vehicle onto the event bus.
3. `services/api`'s WebSocket gateway (Socket.IO) subscribes to the bus and re-broadcasts to clients subscribed to that route/region.
4. `apps/web` interpolates between the last two known positions client-side (requestAnimationFrame lerp) so markers glide instead of jump — this is a client concern, not a server one.
5. Arrival countdowns are computed server-side from vehicle position + route polyline + stop distance, not just a static ETA, so they update smoothly.

This same pipeline is what a real GPS feed plugs into later: `services/gps` would emit the identical `VehiclePositionUpdated` event shape, so `services/api` and everything downstream is unchanged.

## 5. Why NestJS + Next.js + Prisma (confirming the mandated stack fits)

- NestJS gives structured modules/DI, which matters once `simulation`, `gps`, `notifications`, `payments`, `ai` are separate modules/services rather than one blob.
- Next.js App Router for the rider web app: SSR for stop/route pages (good for SEO and cold-load performance), client components for the live map.
- Prisma: schema-first, type-safe, and the migration path from SQLite → Postgres is a one-line datasource change.
- Socket.IO over raw WebSocket: room-based subscriptions (per-route, per-region) are exactly what's needed and hand-rolling that is wasted effort.

## 6. Deployment topology

**MVP:** single Next.js app + single NestJS app, run locally with `npm run dev` in each. No containers required yet.

**Phase 2 (once Docker is installed):** `docker-compose.yml` with `api`, `web`, `postgres`, `redis` services for local dev parity. Deploy target: a single small VM or a PaaS (Render/Railway/Fly.io) — not Kubernetes. Kubernetes-readiness means "the app is stateless and horizontally scalable," not "we run a cluster on day one."

**Phase 3+ (only if real usage demands it):** move to Kubernetes, add Terraform for infra-as-code, add Elasticsearch for analytics search. These are triggered by actual load, not built preemptively.

## 7. Security baseline (from day one, not deferred)

- All API routes require auth except public read-only route/stop/arrival endpoints.
- Input validation via NestJS `class-validator` DTOs on every endpoint.
- Secrets in `.env`, never committed; `.env.example` checked in instead.
- CORS locked to known origins (same pattern already proven on the BuzzKill project).
- Rate limiting (NestJS throttler) on public endpoints from the start.
