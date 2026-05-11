# TRUCKERS NAV By TUE - Product Requirements

## Core Vision
Professional trucking GPS navigation app with real POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, satellite maps, MUTCD-compliant road signs, and customizable UI/HUD layouts. Signature gold (#D4AF37) and black theme throughout.

## Tech Stack
- Frontend: React + TypeScript (Vite), Mapbox GL JS v3.20.0, Tailwind CSS
- Backend: Node.js + Express (server.ts on port 8001)
- Auth: Firebase (Anonymous + Email + Apple Sign-In)
- Storage: Firestore + LocalStorage fallback (localStorage is primary store)
- APIs: Mapbox (Map rendering + Directions + Geocoding), HERE Maps (Routing v8 + Traffic — currently 403), Google Gemini (TTS), Overpass API (POIs, restrictions, traffic infra), PC*MILER (Trimble Maps — requires API key)

## Architecture (Post-Refactor)
```
/app/
├── hooks/
│   └── useNavHooks.ts          # Extracted: useSpeedWarning, useNightMode, useViewportCulling
├── services/
│   ├── routeRestrictions.ts    # Overpass: bridges, weight limits, no-truck zones, weigh stations
│   ├── pcmilerService.ts       # PC*MILER: truck mileage, state breakdown, tolls
│   ├── trafficInfrastructure.ts # Traffic lights, stop signs (via Overpass proxy)
│   └── geminiService.ts        # POI fetch, TTS, Overpass POI fallback
├── components/
│   ├── NavigationView.tsx       # Core map UI (~7500 lines, partially refactored)
│   ├── NavigationHUD.tsx        # Enhanced HUD with 5-level urgency color coding
│   ├── ProNavComponents.tsx     # NextManeuverPreview, SpeedWarningOverlay, ArrivalCountdown, GradeWarningBanner, BridgeHeightWarning, WeightLimitWarning, NoTruckZoneWarning
│   ├── MapControls.tsx          # Night mode toggle, 3D, tilt, follow, overview
│   ├── SettingsView.tsx         # Night Mode toggle, PC*MILER key input
│   └── FirebaseProvider.tsx     # Auth: Email, Guest, Apple Sign-In
├── server.ts                    # Express + Vite (auto-builds dist/ in production)
```

## Completed Features
### Core Navigation
- Truck routing (HERE v8 backend + Mapbox Directions fallback)
- Mapbox GL JS satellite map rendering
- MUTCD-compliant SVG road signs
- Turn-by-turn with voice announcements (imperial units)
- Lane guidance visualization
- Route Comparison Panel (3 alternatives)
- Waypoint system (DEADHEAD/PAID)
- POI system (Overpass fallback when HERE 403)

### Professional CMV Warning Systems
- NextManeuverPreview: Upcoming 3 turns with distances
- SpeedWarningOverlay: Red border flash when exceeding limit
- GradeWarningBanner: Steep grade alerts
- ArrivalCountdown: Final mile approach
- BridgeHeightWarning: Low clearance proximity alert (2mi tiered voice: 2mi/1mi/0.5mi)
- WeightLimitWarning: Weight restriction proximity alert
- NoTruckZoneWarning: hgv=no zone alerts
- Weigh station detection and display
- Viewport-based sign culling (only render visible markers)

### Night Mode Auto-Dimming (P2.2)
- Auto-detects time of day with sunrise/sunset calculation
- Latitude-adjusted for seasonal variation
- Map brightness transitions from 100% (day) to 55% (night)
- 2-second smooth CSS transition
- Toggle in MapControls (moon/sun icon) and Settings page

### Apple Sign-In (P2.5)
- Implemented via Firebase OAuthProvider('apple.com')
- Requests email + name scopes
- Error handling for popup-closed, operation-not-allowed
- Requires Apple Sign-In to be enabled in Firebase Console

### PC*MILER Integration (P2.6)
- Service: /app/services/pcmilerService.ts
- Backend proxy: /api/pcmiler/route
- Supports truck dimensions (height/weight/length/width/hazmat)
- Returns: totalMiles, totalHours, tolls, state breakdown
- Settings UI: API key input in Settings > Display & Integrations
- Requires Trimble Maps API key (developer.trimblemaps.com)

### Refactored Hooks (P1)
- useSpeedWarning: Speed limit tracking + voice alerts
- useNightMode: Time-based auto-dimming with latitude adjustment
- useViewportCulling: Viewport bounds tracking + filter function

## Known Issues
- HERE Routing/Search API returning 403 — app falls back to Mapbox + Overpass
- Gemini TTS API key flagged (403) — falls back to native TTS
- nginx config resets on pod restart (must reconfigure port 3000→8001 proxy)

## Recent Changes
- 2026-05-11: ✅ **5 new fee cards** added to Pay Summary (Cash Advance / Insurance·Cargo·Liability $350 / IFTA $35 / Physical Damage $150 / Trailer Charge $200) — each editable, persisted, deducted from Net Pay. Built via reusable `FlatFeeCard` component for DRY.
- 2026-05-11: ✅ **Cash Advance card** also added to Dashboard with inline `$ + ADD` input; resets on "New Week".
- 2026-05-11: ✅ Net Pay breakdown popover updated to list all 11 deduction lines (Fuel, Truck, Deductions, Maintenance, Admin, Cash Advance, Insurance, IFTA, Physical Damage, Trailer, Escrow).
- 2026-05-11: ✅ **Escrow $0.00 bug fix** — legacy users had `escrowRate=0` saved in localStorage from the first iteration. Added migration: if saved value is `0`, bump to `3%`. Plus a one-shot retroactive accrual so users with existing weekly gross immediately see escrow populate.
- 2026-05-11: ✅ POI markers enlarged to 40px + glow halo; Roads & Highways tile glow green; Escrow card features prominent "This Week" panel.
- 2026-05-11: ✅ **Safe-area-inset support** added to root (`html/body/#root` pads for iOS notch / Android gesture bar / Capacitor WebView) + `overflow-x: hidden` on Pay Summary so wide grids never bleed past device edges. Pay Summary's top row regrid'd `sm:2 / md:3 / xl:6` instead of forced 6-col.
- 2026-05-11: ✅ **Roads & Highways highlight layer** (`setRoadsHighlight` in `hereMapUtils.ts`) — gold-cased overlay of motorway/trunk/primary roads pulled from Mapbox `composite` source. Activates whenever an active route exists; layered beneath the route polyline so the route stays on top. Toggle button (`Construction` icon) added to MapControls when a route is active.
- 2026-05-11: ✅ **Auto-cinematic-tilt on route start** — when route points exist AND zoom ≥ 13, the map auto-tilts to 55° once. Resets when route is cleared so user can re-engage manually.
- 2026-05-11: ✅ Added **Admin Fee** + **Escrow** + **Maintenance Ledger** + **Net Pay Breakdown popover** (see prior changelog entries).
- 2026-05-10: ✅ Added **Maintenance Fee** card + **Maintenance Account** card; auto-accrue per-mile and deduct from weekly gross.
- 2026-05-08: ✅ Added device screen wake-lock hook (`useScreenWakeLock`) wired into AppContent; auto re-acquires on visibilitychange/focus.
- 2026-05-08: ✅ Verified Truck/Driver Profile typing bug fix.
- 2026-05-08: Extracted helpers (`calcDist`, `calcEuclideanDist`, `convertInstructionToImperial`, `synthesizeLanes`) to `/app/utils/navigationHelpers.ts`. NavigationView.tsx ~7350 lines.

## Remaining Tasks
- P2: Driver reputation/review system
- P2: Route Safety Score badge
