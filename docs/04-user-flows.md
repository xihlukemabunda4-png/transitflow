# TransitFlow — Key User Flows

## 1. Plan a trip and track it live (MVP — Naledi/Marco)

1. Open app → map centers on user location (or last-used city if location denied).
2. Tap search bar → enter destination (or select a favorite).
3. See ranked trip options (fastest / fewest transfers) with a "Go" card showing leave-by time, arrival time, and a route-color progress bar — mirrors the Transit app pattern in the shared inspo.
4. Tap a trip → full-screen map with the live vehicle animating along the route, walk segments shown as dotted lines.
5. Countdown updates in real time; if the selected vehicle is delayed mid-trip, the card updates and (Phase 2) pushes a notification.
6. Arrival: map auto-collapses back to search state.

**Guest mode:** steps 1–5 work without an account. Login is only prompted at wallet/ticketing (Phase 2).

## 2. Check a single stop (MVP)

1. Tap a stop marker on the map, or search a stop by name.
2. Stop page shows: upcoming arrivals per route (live countdown), accessibility info, nearby stops.
3. Tap a route row → jumps into flow 1 at step 4.

## 3. Favorite a route + get notified (Phase 2)

1. From a route or stop page, tap the star icon.
2. Favorited routes appear pinned at the top of search.
3. Backend: notification service watches favorited routes per user; on delay/cancellation event, pushes via FCM.

## 4. Wallet top-up and QR ticket purchase (Phase 2)

1. Rider taps Wallet tab → "Add funds" → Stripe/Apple Pay/Google Pay sheet.
2. On success, balance updates; transaction logged.
3. Rider taps "Buy ticket" → selects pass type (single/weekly/monthly/student) → balance debited → QR ticket generated server-side with a signed, time-boxed token (prevents screenshot reuse via server-side single-use validation, not client-side tricks).
4. Driver app (or a validator device) scans QR → calls `POST /tickets/:id/validate` → ticket marked used, offline-validated tickets sync when connectivity returns.

## 5. Driver shift (Phase 2)

1. Driver logs into driver app → sees assigned route/vehicle for the day.
2. Taps "Start shift" → app begins GPS broadcast (real device GPS, or simulation engine in dev) → status flips to "on route" in dispatcher view.
3. If an incident occurs, driver taps "Report" → selects type (breakdown/accident/delay) → 3-tap max → dispatcher notified instantly.
4. Taps "End shift" → GPS broadcast stops, vehicle marked "off duty."

## 6. Dispatcher incident response (Phase 2)

1. Dispatcher sees incident flag appear on live fleet map (red pin + toast).
2. Opens incident → sees driver report, vehicle, route, affected stops.
3. Chooses action: broadcast service alert to riders on that route, reassign a replacement vehicle, or mark resolved.
4. Riders with that route favorited (or actively tracking it) get the alert in-app and via push.

## 7. Admin manages a route (MVP-lite, full in Phase 2)

1. Admin dashboard → Routes → Create/Edit.
2. Draws or edits the route polyline, assigns stops (existing or new), sets schedule/frequency.
3. Save → immediately available to the simulation engine and rider app (no deploy needed — it's data, not code).
