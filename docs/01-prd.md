# TransitFlow — Product Requirements Document

**Tagline:** "The smarter way to move."
**Status:** Draft v1 — pending approval
**Owner:** Solo founder/engineer (you), with Claude Code acting as the engineering team

## 1. Problem

Commuters in most mid-size cities have no reliable way to know when a bus will actually arrive, how full it is, or whether their route is disrupted. Existing global apps (Google Maps, Citymapper) cover major metros well but are thin-to-absent for smaller transit authorities, and transit operators themselves often have no modern rider-facing product at all. TransitFlow is a white-label-able transit platform an operator can deploy to give riders live tracking, planning, ticketing, and disruption alerts — inspired by Transit App, Citymapper, and Apple/Google Maps.

## 2. Vision

A single platform with four faces:
- **Rider app** (web first, mobile later) — live map, arrivals, planning, wallet, tickets.
- **Driver app** — shift management, GPS broadcast, incident reporting.
- **Dispatcher dashboard** — live fleet view, detours, broadcasts.
- **Admin dashboard** — routes, stops, fares, users, analytics.

The long-term ambition (10M+ riders, AI prediction, multi-operator SaaS, wearables, wheelchair-routing, family tracking, carbon stats, rewards) is real and documented, but **is not the starting point**. See [09-roadmap.md](09-roadmap.md) for sequencing — this PRD describes the full product; most of it is post-MVP.

## 3. Target users

See [03-personas.md](03-personas.md) for full detail. Summary: daily commuters, students, tourists, elderly/accessibility-dependent riders, drivers, dispatchers, fleet managers, admins.

## 4. Scope

### 4.1 MVP (Phase 1 — see roadmap)
- Live map with simulated bus positions for one demo city/route set (no real GPS feed initially — see §6).
- Stop pages with live arrival countdowns (from simulation engine).
- Route planner: fastest route, fewest transfers.
- Basic occupancy indicator (simulated).
- Rider accounts (email/password via Clerk or equivalent).
- Light/dark theme, responsive web app.
- Admin: CRUD for routes, stops, vehicles.

### 4.2 Phase 2
- Digital wallet + QR ticketing (Stripe).
- Push notifications for favorited routes.
- Driver app: shift start/end, GPS broadcast, incident reporting.
- Dispatcher dashboard: live fleet map, broadcasts, detours.

### 4.3 Phase 3+
- AI prediction engine with confidence scores.
- Rewards, carbon savings, travel statistics dashboard.
- Family tracking, SOS/emergency features.
- Lost & found.
- Multi-language (en, ts, zu, st, af, fr, pt, sw).
- Wearables (Apple Watch, Wear OS).
- Fleet maintenance tracking.
- Elasticsearch-backed analytics, heat maps.
- Native mobile apps (React Native).

### 4.4 Explicitly out of scope until an operator commits
- Real GPS hardware integration (built to an interface so it's a swap-in later — see §6).
- Kubernetes/Terraform production infra — not needed until there's real traffic to justify it.
- Multi-tenant SaaS billing for other operators.

## 5. Success metrics

MVP is successful if: a rider can open the app, see live (simulated) buses moving smoothly on a map, tap a stop, see an accurate countdown, plan a trip, and the whole thing feels as polished as the Transit app screenshots used as inspiration — not if every feature in §4.2–4.4 exists.

Later-phase metrics (rider retention, on-time prediction accuracy, revenue per operator) will be defined when those phases start.

## 6. Real vs. simulated data

Per the mandatory requirement: build a **simulation engine** (`services/simulation`) that generates realistic vehicle movement, traffic, delays, and incidents against the same interface a real GPS feed would use (`services/gps`). The rest of the platform (API, rider app, dispatcher dashboard) must not know or care which one is live. This lets the whole product be demoed and developed with zero hardware dependency, and swapped to a real feed later by implementing one adapter.

## 7. Non-functional requirements

- Accessibility: WCAG 2.2 AA from day one on the rider web app (screen reader support, contrast, focus states) — this one is cheap to do right early and expensive to retrofit.
- Security: no plaintext secrets, parameterized queries only (Prisma handles this), auth on every API route, rate limiting on public endpoints.
- Performance target for MVP: map interaction stays smooth with up to ~50 simulated vehicles (not 500+ — that's a later load-testing milestone, not a day-one requirement).

## 8. Open questions for you

- Real city/route data, or fully fictional demo city for MVP?
- Is there an actual transit operator relationship in progress, or is this a portfolio/pre-sales build?
- Mobile app (React Native) — needed for MVP demo, or is a responsive web app enough to start?
