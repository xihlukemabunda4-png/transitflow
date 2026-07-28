# TransitFlow — API Specification

Base URL (dev): `http://localhost:3001/api`. NestJS, versioned under `/api/v1` once there's a reason to version. Full OpenAPI/Swagger doc auto-generated from NestJS decorators once implementation starts (`/api/docs`); this file is the human-readable source of truth for the MVP + Phase 2 surface.

## Auth

`Authorization: Bearer <jwt>` on all non-public routes. Auth provider: Clerk (or self-rolled JWT if Clerk is overkill for MVP — decide during implementation).

## MVP endpoints

### Routes & Stops (public read)
```
GET  /routes                    list all routes
GET  /routes/:id                route detail incl. ordered stops + polyline
GET  /stops                     list stops (supports ?near=lat,lng&radiusM=)
GET  /stops/:id                 stop detail
GET  /stops/:id/arrivals        live arrivals for a stop
       → [{ routeId, vehicleId, etaSeconds, occupancy, wheelchairAccessible }]
```

### Trip planning (public read)
```
GET  /plan?from=lat,lng&to=lat,lng&mode=fastest|fewest_transfers|wheelchair
       → [{ legs: [...], departAt, arriveAt, totalDurationSeconds }]
```

### Vehicles (public read, plus WebSocket)
```
GET  /vehicles?routeId=          current vehicles + last known position
```

### WebSocket (Socket.IO namespace `/live`)
```
client → server: subscribe { routeId } | subscribe { bbox: [swLat,swLng,neLat,neLng] }
server → client: vehicle:position { vehicleId, lat, lng, heading, speedKph, occupancy, ts }
server → client: vehicle:status   { vehicleId, status }
```

### Auth & user (MVP)
```
POST /auth/signup
POST /auth/login
GET  /me
PATCH /me/accessibility          update AccessibilityPrefs
GET  /me/favorites
POST /me/favorites               { routeId }
DELETE /me/favorites/:routeId
```

### Admin (MVP-lite: routes/stops/vehicles CRUD, auth role=ADMIN)
```
POST   /admin/routes
PATCH  /admin/routes/:id
DELETE /admin/routes/:id
POST   /admin/stops
PATCH  /admin/stops/:id
POST   /admin/vehicles
PATCH  /admin/vehicles/:id
```

## Phase 2 endpoints

### Wallet & tickets
```
GET  /wallet                     balance + recent transactions
POST /wallet/topup               { amountCents, paymentMethodId } → Stripe PaymentIntent
POST /tickets                    { passType } → debits wallet, issues Ticket
GET  /tickets                    rider's tickets (active + history)
POST /tickets/:id/validate       driver/validator device, single-use enforced server-side
```

### Notifications
```
POST /notifications/register-device   { fcmToken }
```
(Delivery itself is server-initiated via `services/notifications`, not a client-pulled endpoint.)

### Driver app
```
POST /driver/shifts/start         { vehicleId } → begins GPS broadcast expectation
POST /driver/shifts/end
POST /driver/shifts/:id/incidents { type, description }
WS   driver → server: gps:position { lat, lng, heading, speedKph }  (real device feed)
```

### Dispatcher
```
GET  /dispatch/fleet               live snapshot, all vehicles + statuses
GET  /dispatch/incidents?open=true
POST /dispatch/incidents/:id/resolve
POST /dispatch/alerts              { routeId, message } → pushes to riders tracking/favoriting that route
```

## Error format (all endpoints)

```json
{ "statusCode": 404, "error": "NOT_FOUND", "message": "Stop not found" }
```

## Rate limits (MVP)

Public GET endpoints: 60 req/min/IP via NestJS `@Throttle`. WebSocket subscribe: max 20 active route/bbox subscriptions per connection.
