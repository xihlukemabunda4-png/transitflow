# TransitFlow — User Personas

## Riders

### Naledi — Daily Commuter
- 27, works a 9–5 office job, takes the same two routes every weekday.
- Wants: reliable arrival countdowns, a notification if her usual bus is delayed before she leaves home, minimal taps to see "when's my bus."
- Pain today: no way to know if a delay means "leave now" or "leave in 10."
- Key features: favorited routes, arrival notifications, home screen widget (later).

### Thandiwe — Student
- 19, budget-constrained, transfers between two routes to get to campus.
- Wants: cheapest fare option, student pass, fewest transfers.
- Key features: route planner "cheapest" mode, student pass in wallet.

### Marco — Tourist
- 34, visiting for a week, unfamiliar with the city or local payment methods.
- Wants: simple point-to-point directions, doesn't want to create an account just to check a bus time.
- Key features: guest mode (no login required for read-only planning/tracking), multi-language, nearby-attractions on stop pages.

### Mrs. Dlamini — Elderly / Accessibility-dependent rider
- 71, uses a cane, needs wheelchair-accessible vehicles some days.
- Wants: large text, high contrast, wheelchair-accessible route filter, confidence that the bus she's waiting for actually stops where she is.
- Key features: accessibility settings, wheelchair-accessible routing, voice navigation (later phase).

## Operations

### Sipho — Bus Driver
- Drives an 8-hour shift, needs the driver app to be fast and require minimal interaction while on the road.
- Wants: one-tap shift start/end, simple incident reporting, doesn't want to fight a complicated UI mid-route.
- Key features (Phase 2): shift management, GPS auto-broadcast (no manual entry), large touch targets, incident report with 3 taps max.

### Zanele — Dispatcher
- Monitors 30–500 vehicles across a city from a control room.
- Wants: at-a-glance fleet health, fast incident response, ability to broadcast a detour to affected riders instantly.
- Key features (Phase 2): live fleet map, filter by route/status, one-click service alerts.

### Farai — Fleet Manager / Admin
- Owns route planning, fare pricing, and vehicle maintenance schedules for the operator.
- Wants: CRUD on routes/stops/fares, visibility into which vehicles need service, revenue/usage reporting.
- Key features: admin dashboard, analytics (Phase 3), maintenance alerts (Phase 3).

## Why this matters for sequencing

The MVP (see [09-roadmap.md](09-roadmap.md)) only needs to satisfy Naledi, Thandiwe, and Marco — the read-only/planning riders. Mrs. Dlamini's accessibility needs are baked into the design system from day one (cheap now, expensive later) even though full voice navigation ships later. Sipho, Zanele, and Farai's needs don't start until Phase 2's driver app and dispatcher dashboard.
