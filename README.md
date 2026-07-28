# TransitFlow

**"The smarter way to move."**

A transit platform for live vehicle tracking, trip planning, ticketing, and operator tooling — inspired by Transit App, Citymapper, and Apple/Google Maps.

## Status

Phases 1–3 of the roadmap are implemented and working against a local SQLite database (simulated GPS, no real transit operator connected yet). See [docs/](docs/) for the full spec:

1. [Product Requirements](docs/01-prd.md)
2. [System Architecture](docs/02-architecture.md)
3. [User Personas](docs/03-personas.md)
4. [User Flows](docs/04-user-flows.md)
5. [Database Schema](docs/05-database-schema.md)
6. [API Specification](docs/06-api-spec.md)
7. [Monorepo Folder Structure](docs/07-folder-structure.md)
8. [Design System](docs/08-design-system.md)
9. [Development Roadmap](docs/09-roadmap.md)

**What's live:** rider web app (live map, trip planning, wallet/tickets, favorites, safety tools, trip sharing), driver app, dispatcher dashboard, admin panel, and a React Native mobile app scaffold.

**Deferred by choice:** Postgres/Redis migration (needs Docker — see below), real Stripe/FCM accounts (mock providers used instead), native mobile builds (typechecked but not verified on a device/emulator from this machine).

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run build --workspace=services/simulation
```

**API** (in `services/api/`):
```bash
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev --workspace=services/api
```
Runs at `http://localhost:3001`. Seeds two demo routes, a rider account (`rider@example.com` / `password123`), and an admin account (`admin@transitflow.dev` / `admin12345` — **dev-only, change before any real deployment**).

**Web app**:
```bash
npm run dev --workspace=apps/web
```
Runs at `http://localhost:3000`. Also serves `/admin`, `/driver`, and `/dispatch`.

**Mobile app** (in `apps/mobile/`, code-only verified — see Status above):
```bash
npm run web --workspace=apps/mobile
```

## Environment

| Tool | Status |
|---|---|
| Node.js / npm | required |
| Docker | optional — only needed for the deferred Postgres/Redis migration |
| Python | not required by current stack |

## Tech stack

Next.js (App Router) + TypeScript + Tailwind + MapLibre GL on the frontend; NestJS + Prisma (SQLite for now) on the backend; Socket.IO for realtime vehicle positions and live alerts; a simulation engine standing in for real GPS feeds until an operator provides one. Full stack detail in [docs/02-architecture.md](docs/02-architecture.md).

## License

MIT — see [LICENSE](LICENSE).
