# TransitFlow — Monorepo Folder Structure

npm workspaces (no need for Turborepo/Nx complexity until the monorepo actually has enough packages to benefit — can add later without restructuring).

```
transitflow/
├── apps/
│   ├── web/                 # (MVP) Next.js rider app
│   ├── driver/               # (Phase 2) driver app — stub only in MVP
│   ├── admin/                 # (MVP-lite) admin dashboard, can start as routes inside web/
│   └── dispatcher/            # (Phase 2) dispatcher dashboard — stub only in MVP
│   └── mobile/                 # (Phase 3) React Native — not created until Phase 3
├── services/
│   ├── api/                  # (MVP) NestJS: routes/stops/plan/auth/admin modules
│   ├── simulation/            # (MVP) vehicle movement engine
│   ├── gps/                    # (Phase 2+) real GPS feed adapter — interface defined, empty impl
│   ├── notifications/          # (Phase 2) FCM push
│   ├── payments/                # (Phase 2) Stripe wallet/ticketing
│   └── ai/                       # (Phase 3) prediction engine — interface defined, empty impl
├── packages/
│   ├── types/                 # (MVP) shared TS types (Vehicle, Route, Stop, API DTOs)
│   ├── ui/                     # (MVP, grows over time) shared React components
│   ├── config/                  # (MVP) shared eslint/tsconfig/tailwind config
│   └── utils/                    # (MVP) shared pure helpers (geo math, formatting)
├── docs/                       # this folder
├── infrastructure/              # (Phase 2+) docker-compose.yml; Terraform added Phase 3+
├── .github/
│   └── workflows/                # (MVP) lint + typecheck + test on PR
├── package.json                  # workspaces root
├── tsconfig.base.json
├── .env.example
└── README.md
```

## What actually gets created in MVP implementation

Everything marked **(MVP)** above, plus empty-but-typed stub folders for **(Phase 2)/(Phase 3)** items so imports and the architecture diagram stay accurate — not full implementations. `apps/driver`, `apps/dispatcher`, `services/notifications`, `services/payments`, `services/ai`, `apps/mobile`, and `infrastructure/` (Docker/Terraform) are not built until their respective roadmap phase starts.

## Package boundaries

- `packages/types` is the contract between `services/api` and every `apps/*` — changing a type here is a breaking-change signal.
- `packages/ui` only contains presentational components (no data fetching) so it's reusable across `apps/web` and later `apps/admin`/`apps/dispatcher`.
- No app imports another app's code directly — only through `packages/*` or the API.
