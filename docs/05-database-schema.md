# TransitFlow — Database Schema

Prisma schema, written against PostgreSQL syntax (works unchanged against SQLite for MVP dev, per [02-architecture.md](02-architecture.md), with minor type caveats noted inline). Lives at `services/api/prisma/schema.prisma` once implementation starts.

MVP entities are marked **(MVP)**; the rest are Phase 2/3 and included now so the schema doesn't need breaking migrations later.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // MVP: "sqlite" locally, same models
  url      = env("DATABASE_URL")
}

// ── Core transit data (MVP) ─────────────────────────────

model Route {
  id          String   @id @default(cuid())
  shortName   String   // "10", "B"
  longName    String   // "Downtown - Airport"
  color       String   // hex, drives map + UI color
  polyline    String   // encoded polyline (Mapbox/Google format)
  stops       RouteStop[]
  vehicles    Vehicle[]
  wheelchairAccessible Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Stop {
  id          String   @id @default(cuid())
  name        String
  lat         Float
  lng         Float
  wheelchairAccessible Boolean @default(true)
  routes      RouteStop[]
  createdAt   DateTime @default(now())
}

model RouteStop {
  id        String @id @default(cuid())
  route     Route  @relation(fields: [routeId], references: [id])
  routeId   String
  stop      Stop   @relation(fields: [stopId], references: [id])
  stopId    String
  sequence  Int    // order along the route
  distanceFromStartM Float // meters from route start, for ETA math

  @@unique([routeId, stopId])
  @@index([routeId, sequence])
}

model Vehicle {
  id           String   @id @default(cuid())
  label        String   // fleet number, e.g. "BUS-042"
  route        Route?   @relation(fields: [routeId], references: [id])
  routeId      String?
  capacitySeated   Int  @default(40)
  capacityStanding Int  @default(20)
  wheelchairSpaces Int  @default(2)
  bicycleSpaces    Int  @default(2)
  source       VehicleSource @default(SIMULATED) // SIMULATED | GPS_FEED
  status       VehicleStatus @default(OFF_DUTY)
  driver       Driver?  @relation(fields: [driverId], references: [id])
  driverId     String?
  positions    VehiclePosition[]
  createdAt    DateTime @default(now())
}

enum VehicleSource {
  SIMULATED
  GPS_FEED
}

enum VehicleStatus {
  OFF_DUTY
  ON_ROUTE
  DELAYED
  OUT_OF_SERVICE
}

// Latest position is a hot-path read; also append-only logged for history/replay.
model VehiclePosition {
  id          String   @id @default(cuid())
  vehicle     Vehicle  @relation(fields: [vehicleId], references: [id])
  vehicleId   String
  lat         Float
  lng         Float
  heading     Float    // degrees
  speedKph    Float
  occupancy   OccupancyLevel
  recordedAt  DateTime @default(now())

  @@index([vehicleId, recordedAt])
}

enum OccupancyLevel {
  EMPTY
  AVAILABLE
  LIMITED
  STANDING_ONLY
  FULL
}

// ── Users (MVP) ──────────────────────────────────────────

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  displayName   String?
  role          UserRole @default(RIDER)
  accessibility AccessibilityPrefs?
  favoriteRoutes FavoriteRoute[]
  wallet        Wallet?
  tickets       Ticket[]
  driver        Driver?
  createdAt     DateTime @default(now())
}

enum UserRole {
  RIDER
  DRIVER
  DISPATCHER
  ADMIN
}

model AccessibilityPrefs {
  id             String  @id @default(cuid())
  user           User    @relation(fields: [userId], references: [id])
  userId         String  @unique
  highContrast   Boolean @default(false)
  largeText      Boolean @default(false)
  wheelchairOnly Boolean @default(false)
}

model FavoriteRoute {
  id      String @id @default(cuid())
  user    User   @relation(fields: [userId], references: [id])
  userId  String
  routeId String

  @@unique([userId, routeId])
}

// ── Operations (Phase 2) ────────────────────────────────

model Driver {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String   @unique
  vehicles  Vehicle[]
  shifts    Shift[]
}

model Shift {
  id        String    @id @default(cuid())
  driver    Driver    @relation(fields: [driverId], references: [id])
  driverId  String
  startedAt DateTime
  endedAt   DateTime?
  incidents Incident[]
}

model Incident {
  id          String    @id @default(cuid())
  shift       Shift     @relation(fields: [shiftId], references: [id])
  shiftId     String
  type        IncidentType
  description String?
  resolvedAt  DateTime?
  createdAt   DateTime  @default(now())
}

enum IncidentType {
  BREAKDOWN
  ACCIDENT
  DELAY
  ROAD_CLOSURE
  OTHER
}

// ── Wallet & ticketing (Phase 2) ────────────────────────

model Wallet {
  id           String   @id @default(cuid())
  user         User     @relation(fields: [userId], references: [id])
  userId       String   @unique
  balanceCents Int      @default(0)
  transactions Transaction[]
}

model Transaction {
  id        String   @id @default(cuid())
  wallet    Wallet   @relation(fields: [walletId], references: [id])
  walletId  String
  amountCents Int    // positive = top-up, negative = spend
  type      TransactionType
  stripeRef String?
  createdAt DateTime @default(now())
}

enum TransactionType {
  TOP_UP
  TICKET_PURCHASE
  REFUND
}

model Ticket {
  id         String   @id @default(cuid())
  user       User     @relation(fields: [userId], references: [id])
  userId     String
  passType   PassType
  qrToken    String   @unique // signed, single-use
  validFrom  DateTime
  validUntil DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())
}

enum PassType {
  SINGLE
  WEEKLY
  MONTHLY
  STUDENT
  SENIOR
  FAMILY
}
```

## Notes

- `VehiclePosition` is append-only and will grow fast; Phase 2 adds a retention job (e.g. keep 30 days raw, downsample older) once Postgres is in place — not needed for MVP/SQLite demo data volumes.
- `Vehicle.source` is the concrete expression of the simulation/real-GPS swap described in the architecture doc: the rest of the schema doesn't care which one wrote the row.
- QR ticket single-use/anti-screenshot is enforced by `usedAt` being set atomically on first validation (transaction with `WHERE usedAt IS NULL`), not by anything client-side.
