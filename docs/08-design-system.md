# TransitFlow — Design System

**Reference inspiration** (from the Mobbin screenshots you shared): Transit app's bottom-sheet-over-map pattern, bold rounded "GO" CTA, route-colored progress bars, and Apple Maps' translucent draggable sheet with quick-action pills (Home/Work/Add). TransitFlow's design language borrows the *structure* of these (map-first, sheet-driven navigation, high-contrast route colors) without copying their exact visual identity — TransitFlow needs its own brand.

## 1. Brand direction

- **Primary color:** a confident teal-green (`#0EA36E`) — distinct from Transit's brand green and from typical "generic blue transit app," while still reading as "go/movement" the way green does in wayfinding. Route-specific colors (from `Route.color` in the schema) override this per-route on the map.
- **Personality:** calm, precise, trustworthy — not playful. Riders check this app when they're stressed about being late; the UI should reduce anxiety, not add delight-for-delight's-sake animation.
- **Dark mode is not an afterthought** — the map and bottom sheet both need first-class dark variants since transit apps get heavy evening/night use.

## 2. Design tokens

```
Color (light)
  --tf-bg:            #FFFFFF
  --tf-surface:        #F4F6F5      // bottom sheet background
  --tf-surface-raised: #FFFFFF      // cards on top of sheet
  --tf-primary:        #0EA36E
  --tf-primary-ink:     #FFFFFF     // text on primary
  --tf-text:             #14181A
  --tf-text-muted:        #5B6663
  --tf-border:              #E2E8E5
  --tf-danger:                #D64545  // delays/incidents
  --tf-warning:                 #E0A526 // limited occupancy
  --tf-success:                  #1E9E5A // on-time / plenty of seats

Color (dark)
  --tf-bg:            #0B0F0E
  --tf-surface:        #15201C
  --tf-surface-raised: #1C2924
  --tf-primary:        #22C989      // brightened for dark contrast
  --tf-primary-ink:     #04140D
  --tf-text:              #EDF2F0
  --tf-text-muted:          #93A39C
  --tf-border:                #263631

Typography
  --tf-font: "Inter", system-ui, sans-serif   // geometric, high legibility at small sizes (arrival countdowns)
  Scale: 12 / 14 / 16 / 20 / 28 / 36 (px), 1.25 ratio-ish, tuned by eye
  Countdown numerals use tabular-nums so they don't jitter as digits change

Radius
  --tf-radius-sm: 8px    // chips, pills
  --tf-radius-md: 16px   // cards
  --tf-radius-lg: 24px   // bottom sheet top corners

Elevation
  Bottom sheet: soft shadow + optional backdrop-blur(20px) over the map (glassmorphism, used sparingly — only for the sheet, not everywhere)
```

## 3. Core patterns

### Map + bottom sheet (primary navigation shell)
Full-bleed map, persistent draggable bottom sheet (collapsed/half/full states) — same interaction model as both inspo apps. Search bar lives at the top of the sheet in collapsed state; trip results replace it when active.

### Occupancy indicator
Dot + label, never color alone (accessibility):
```
🟢 Plenty of seats     --tf-success
🟡 Limited seats        --tf-warning
🟠 Standing room only    (amber-orange, between warning/danger)
🔴 Full                    --tf-danger
```

### Route color chips
Pill-shaped, route's own color as background, white or black text chosen by contrast ratio (compute, don't hardcode) — matches the "70", "RL", "B" pills in the inspo screenshots.

### Trip result card
Route-colored progress bar showing the journey segments (walk/transit/walk), leave-by + arrive-by times, bold rounded CTA button (`--tf-primary`) to start tracking — directly modeled on the Transit app "GO" card.

## 4. Accessibility (WCAG 2.2 AA, non-negotiable from MVP)

- All color pairs above meet 4.5:1 contrast minimum for text.
- Every icon-only control has an `aria-label`.
- Map markers are also exposed as a list (stop/vehicle list view) for screen reader users who can't meaningfully use a live map.
- Touch targets minimum 44×44px (driver app especially — Sipho persona needs this while a bus is moving).
- `prefers-reduced-motion` respected: vehicle marker interpolation and sheet transitions fall back to instant/near-instant.
- High-contrast and large-text modes (from `AccessibilityPrefs` in the schema) are real token overrides, not just browser zoom.

## 5. Component inventory (packages/ui, built incrementally)

MVP: `MapView`, `BottomSheet`, `SearchBar`, `TripResultCard`, `StopArrivalRow`, `OccupancyBadge`, `RouteChip`, `Button`, `Input`, `ThemeToggle`.
Phase 2+: `WalletCard`, `QRTicket`, `IncidentBanner`, `DriverShiftControl`, `DispatchFleetMap`.

Built with Tailwind CSS + the tokens above as CSS variables (not hardcoded Tailwind colors), so theming stays centralized. Framer Motion used for the sheet drag/settle physics and marker interpolation easing — not for decorative animation.
