# TransitFlow — Development Roadmap

Honest sequencing for a solo build on a Windows machine that currently has Node.js + Git, but not Docker, Python, or PostgreSQL. Each milestone lists what needs installing before it can start.

## Phase 0 — Environment & scaffold (before any feature code)
- Install Docker Desktop **only when Phase 2 starts** (not needed for Phase 1 — see below).
- `npm init` workspaces root, `packages/types`, `packages/config`.
- Scaffold `services/api` (NestJS) with SQLite via Prisma — zero extra installs needed, npm/Prisma handles it.
- Scaffold `apps/web` (Next.js + Tailwind).
- Get a Mapbox account + free-tier API key (external signup, not a local install).
- **Blocker check:** none — this phase runs entirely on what's already installed.

## Phase 1 — MVP (rider read-only experience)
Goal: a working demo — live simulated map, stop arrivals, trip planning — deployable to show an operator or put in a portfolio.
- `services/simulation`: tick-based vehicle movement engine, seeded with a small fictional route set (or a real city's GTFS static data if you want realism — GTFS is free public data for many cities).
- `services/api`: routes/stops/vehicles/plan endpoints + Socket.IO gateway.
- `apps/web`: map + bottom sheet shell, search, trip results, stop page, live tracking with marker interpolation.
- Basic auth (email/password) + favorites.
- Admin: minimal routes/stops CRUD (can live inside `apps/web` under `/admin` to avoid standing up a separate app yet).
- Accessibility baseline (contrast, labels, reduced-motion) built in now.
- **Exit criteria:** you can open the app, watch buses move smoothly, tap a stop, get an accurate live countdown, and plan a trip — end to end, no mocked screenshots.

## Phase 2 — Payments, notifications, driver/dispatcher
**Prerequisite:** install Docker Desktop (for local Postgres+Redis parity) and set up a Stripe account.
- Migrate SQLite → Postgres, add Redis for pub/sub and caching.
- `services/payments` (Stripe wallet + QR ticketing).
- `services/notifications` (FCM push for favorited-route alerts).
- `apps/driver`: shift start/end, GPS broadcast, incident reporting.
- `apps/dispatcher`: live fleet map, incident response, broadcast alerts.
- `services/gps`: real GPS feed adapter interface implemented (even if only tested against a second simulation instance until a real operator provides hardware).
- CI: GitHub Actions running lint/typecheck/test on every PR.

## Phase 3 — Intelligence & retention features
- `services/ai`: arrival prediction using historical + live data, with confidence scores.
- Rewards, carbon savings, travel statistics dashboard.
- Multi-language (start with English + the languages you actually need first, expand from there).
- Family tracking (with explicit privacy controls, opt-in, and a clear data-retention policy — this is the most privacy-sensitive feature in the whole product and deserves its own review pass before building).
- Lost & found, SOS/emergency contacts.
- Fleet maintenance tracking.
- Analytics dashboard (Elasticsearch or, more likely, Postgres + a BI tool — Elasticsearch is heavy infra to justify before there's real query volume).

## Phase 4 — Scale-out
- React Native mobile apps (`apps/mobile`).
- Wearables (Apple Watch, Wear OS).
- Kubernetes + Terraform, only once traffic or reliability requirements actually demand it over a simpler PaaS deploy.
- Multi-operator/multi-tenant support if this becomes a sellable SaaS product rather than a single-operator deployment.

## Explicit non-goals until triggered by real need
- 500+ concurrent simulated vehicles (build for ~50, load-test and scale the tick loop when a real scenario needs more).
- 10M-user infra sizing — right-size for actual signups, not a hypothetical.
- Kubernetes/Terraform before there's a second environment (staging) that justifies infra-as-code.

## Immediate next step (Phase 0, ready to start now)
Once you approve these docs, I'll scaffold the npm workspace, `packages/types`, and a bare NestJS + Next.js app that boot successfully — that's the first thing worth running in the browser preview to confirm before building features on top.
