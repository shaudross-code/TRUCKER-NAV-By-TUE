# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities into single location icons, fix UI/map bugs, and add specific truck service POIs to the map and sidebar filter. Product requirements include turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D and 2D map views, and mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Firestore + localStorage for filters/waypoints
- **APIs**: HERE Maps, Google Maps Platform, MapTiler, Gemini, Mapbox

## What's Been Implemented

### Phase 1 — Core Navigation (DONE)
- Truck-specific GPS routing via HERE Maps API
- Turn-by-turn real-time updates (2s throttle)
- Reroute & Clear buttons in navigation bar
- North-up / heading-up toggle

### Phase 2 — POI System (DONE)
- Real POI fetching via HERE API + Overpass fallback
- Brand-specific SVG icons for all major truck stop chains
- Filter panel with toggle for all POI categories

### Phase 3 — Traffic Infrastructure (DONE)
- Real-time traffic signs/lights alerts (trafficInfrastructure.ts)
- Audio speech alerts via Gemini TTS
- Low Clearance POIs with animated warning icons

### Phase 4 — 3D Navigation (DONE)
- Mapbox GL JS 3D driver perspective view (Navigation3DView.tsx)
- 2D/3D toggle button in map controls
- Fixed routePoints → routeCoordinates mapping bug

### Phase 5 — Mobile Setup (DONE)
- Capacitor v6.2.0 initialized for iOS + Android
- App Store icons and screenshots generated (store-assets/)
- Firebase Admin SDK configured via serviceAccountKey.json

### Phase 11 — Load Board: Dynamic Loads + Editable Targets (DONE — 2026-03-25)
- **Dynamic loads near GPS location**: 53 US cities database, `haversine()` filter — loads generated from cities within 200 miles of user, destinations 300-2000 miles away
- **Editable RPM Target** (`data-testid=target-rate-field`): click → inline input → Enter saves; loads color-coded green (≥ target) / orange (< target); persisted to `localStorage['truck_target_rate']`
- **Editable Max Weight** (`data-testid=max-weight-field`): click → inline input → Enter saves; loads ≥ max weight show "Overweight" and disable Book Now; persisted to `localStorage['truck_max_weight']`
- **Distance badge** on each card: "X mi from you" to pickup city
- **Stats bar**: load count, how many meet rate target, capacity display
- **Auto-refresh** every 60s + manual Refresh button
- Weight formula bug fixed: `Math.round((min + r * range) / 1000) * 1000` (operator precedence)
- Fixed `nextSpeedLimit is not defined` ReferenceError in 3D view → replaced with `currentSpeedLimit ?? undefined`
- Fixed `nextTurnDistance.toFixed is not a function` → `parseFloat(nextInstruction.distance) || undefined`
- Fixed `incident.from.offset` undefined crash → added null-guard filter on incidents
- Fixed `action.offset` crash → defaulted to `?? 0` with `|| 1` for safe division
- Fixed `userLocation` lat/lon coordinate swap in Mapbox GL → `[lon, lat]` order now correct for both `new Map()` and `easeTo()`
- Fixed HERE Maps v1 tiles returning HTTP 410 (Gone) → switched to MapTiler `streets-v2-dark` GL style
- Added `process.env.REACT_APP_MAPBOX_TOKEN` to Vite `define` block so Mapbox token is available
- 3D view now uses MapTiler GL-compatible style (works in preview env)
- Route demonstrated: Detroit, MI → Midland, MI = **128.1 miles, 2h 21min** via HERE Routing API
- Created `LoadingScreen.tsx` — full-screen black/gold splash with:
  - App icon (truck/THE letters from `/app-icon.png`) with animated gold glow halo
  - "TRUCKERS NAV / By TUE" title with staggered entrance animation
  - Double-ring TUE spinner (outer ring spins CW, inner ring CCW)
  - 5-step status text cycling: "Initializing session..." → "Loading truck profile..." → etc.
  - Animated progress bar tracking status steps
- Shows for minimum 2.8 seconds on every fresh load (regardless of Firebase auth speed)
- Smooth 750ms opacity fade-out transition to Dashboard
- Static asset: copied `/app/app-icon.png` → `/app/public/app-icon.png`
- Added `getPoiFilterIcon(id)` to `PoiIcon.tsx` — 43 brand-accurate 20×20 SVG icons
- Every filter item now shows a mini brand icon: authentic colors (Love's red/yellow, Shell yellow/red star, BP green/yellow, Walmart blue/yellow spark, etc.)
- Removed all emoji labels, replaced with clean text + SVG icon (including Traffic Signs toggle)
- Filter panel widened to `w-48 md:w-64` to accommodate icon + label layout
- Icons fade/scale on hover and glow when filter is active
- Added **Parking Status section** to every POI popup
- 4 colored report buttons: **Light** (green), **Medium** (yellow), **Heavy** (orange), **Maxed** (red)
- Shows current crowd-sourced status badge, last updated timestamp, and total report count
- Data persisted in `/app/data/parking_status.json` via file-based JSON store
- APIs: `GET /api/poi/parking-status?poiId=` and `POST /api/poi/parking-status`
- POI ID keyed as `lat.toFixed(4)_lon.toFixed(4)` for consistent cross-session matching
- Updated: server.ts, NavigationView.tsx
Added to filter panel, map icons, category detection, and API queries:
- **Fuel brands**: Exxon, Shell, BP, Marathon, Circle K, 7-Eleven
- **Retail with truck parking**: Lowe's, Home Depot
- Updated: MapControls.tsx, PoiIcon.tsx, NavigationView.tsx, geminiService.ts

### Phase 14 — Touch Orientation + Device Compass Mode (DONE — 2026-03-25)
- **Touch rotation fixed** — CSS changed from `.map-heading-up .leaflet-rotate-pane` to `.leaflet-rotate-pane` so 2-finger rotation works in ALL map modes (North-up + Heading-up)
- `manualRotation` useEffect now immediately applies `--map-rotation` CSS variable (no longer waits for telemetry tick)
- **Device Compass Mode** — new compass toggle button in map controls:
  - Subscribes to `deviceorientationabsolute` (preferred) + `deviceorientation` (fallback)
  - iOS 13+ permission via `DeviceOrientationEvent.requestPermission()`
  - `webkitCompassHeading` for true north on iOS, `360 - alpha` fallback for Android
  - When active: rotates map pane + vehicle icon from physical compass, bypasses GPS heading
  - UI: blue glow + `animate-ping` dot when active
- **Bug fix** — `L.point().rotate()` is not a Leaflet method; replaced with manual trigonometry (`sin/cos`) in both the heading-up pan-ahead and compass pan-ahead blocks
- **Parking Confidence Indicator** (distribution POIs only: Lowe's, Home Depot, Walmart):
  - 4-segment visual confidence bar — fills based on crowd-sourced status (light=4, medium=3, heavy=2, maxed=1)
  - Color-coded: emerald (high) → yellow → orange → red (full/no space)
  - Descriptive text: "Plenty of truck space reported" to "Reported full — no truck parking available right now"
  - "Unverified" grey state when no driver reports yet
  - Shows report count + last updated timestamp
  - Appears ABOVE the regular parking status buttons (so confidence level is immediately visible)
  - Non-distribution POIs (fuel/service/rest areas) continue to show the standard parking status section only
- **3D Camera Tracking**:
  - `Navigation3DView` now subscribes to `TelemetryContext` directly via `useContext`
  - Real-time heading updates via `telemetry.subscribe()` — fires at 400ms duration (heading-only easeTo)
  - Location+heading updates via `[userLocation, heading]` effect — fires at 800ms duration (full position+bearing easeTo)
  - Speed-adaptive zoom: highway (>55mph) → 16.5, regular (>25mph) → 17, slow/stopped → 17.5
  - `userLocationRef` keeps location accessible inside the telemetry subscription closure

## Prioritized Backlog

### P2 — Future
- Final App Store (Apple) and Google Play submissions
  - Blocked: user must generate signing certificates (see /app/SIGNING_GUIDE.md)

## Known Issues
- Platform preview URL requires manual wake via Emergent Dashboard (ingress cache)
- NavigationView.tsx is 4500+ lines — candidate for future refactor

## Key Files
- `/app/components/NavigationView.tsx` — core map + POI orchestration
- `/app/components/MapControls.tsx` — filter panel + map buttons
- `/app/components/PoiIcon.tsx` — brand icons + category detection
- `/app/components/Navigation3DView.tsx` — Mapbox 3D mode
- `/app/services/geminiService.ts` — HERE API POI fetching
- `/app/services/trafficInfrastructure.ts` — traffic alerts
- `/app/server.ts` — Express server on port 8001
