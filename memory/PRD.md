# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app. Features: HERE Maps satellite hybrid, turn-by-turn navigation, real-time hazard alerts, MUTCD road signs, customizable HUD layouts, POI clustering, multi-user support, guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware
- **Database**: Firebase Firestore (user profiles), LocalStorage (HUD layout, guest settings, driver profile, truck profile)
- **Maps**: HERE logistics.satellite.day tiles (vehicle_restrictions, ppi=400, flat default + tilt toggle, no CSS tint) + Mapbox satellite-streets-v12 (SAT 2D)

## Completed Features
- [x] HERE Maps JS API v3.1 (replaced Leaflet)
- [x] HERE logistics.satellite.day hybrid tiles with vehicle restrictions overlay
- [x] Converted Mapbox 3D to 2D SAT view
- [x] H.clustering.Provider POI clustering
- [x] Fixed user location icon jitter + CMV-grade heading stabilization
- [x] Simplified MapControls (hamburger, filter, zoom, level, HERE/SAT, tilt, follow)
- [x] POI panel: collapsible, scrollable, click-to-center, ALL route POIs
- [x] Highway exit items in POI panel (blue interstate shields, exit numbers, names)
- [x] Warning signs panel (right side, gold/black MUTCD: height, weight, curves)
- [x] Vehicle restrictions overlay (no-truck, weight limits, height barriers)
- [x] High-res tiles (ppi=400), no CSS tint/filters
- [x] Explicit z-index layering: routes(100) < facilities(200) < signs(900)
- [x] Map flat by default + tilt toggle button
- [x] Auto-responsive UI scaling (viewport + orientation)
- [x] Weather overlay swipe-to-dismiss + restore button
- [x] **Driver Profile feature** (first name, last name, phone, email, CDL number, license expiry) — Apr 9
- [x] **Fixed Truck Profile input bug** (string state, no '0' display, RECOMMENDED defaults, Reset Defaults btn) — Apr 9
- [x] **Lane Guidance gold #D4AF37 theme** (replaced blue #4285F4) — Apr 9
- [x] **Route Comparison gold/black theme** (bg-black/95, gold borders, italic title) — Apr 9
- [x] **Removed all CSS gold/black tint filters** — Apr 9
- [x] Turn-by-turn navigation with voice + route comparison
- [x] MUTCD road signs (Interstate shields, Speed Limits, Truck Warnings)
- [x] Real-time truck restrictions and toll warnings
- [x] Weather widget with 3-day forecast
- [x] Customizable HUD Layout (Display tab)
- [x] Traffic incident overlays + auto-reroute countdown
- [x] Guest login + Google Sign-In + 2-hour session timer
- [x] HERE Routing API v8.140.0 truck routing
- [x] Nginx proxy config (port 3000 to 8001)

## Known Issues
- Gemini TTS key degraded (403) — falls back to native speech
- Overpass API 504 timeouts (intermittent corridor POI fetch)
- Intermittent trucker-nav service drops
- HERE API fuelConsumption parameter returns 400 (non-blocking)

## Upcoming Tasks (P1)
- [ ] Refactor NavigationView.tsx (~6900 lines) into smaller hooks/components
- [ ] Speed limit warning system (red flash + audio when exceeding)
- [ ] Viewport-based sign culling for DOM performance

## Future Tasks (P2)
- [ ] Apple Sign-In, PC*MILER Data, Route Safety Score
- [ ] Map filtering for Reputation Scores, Driver review system
- [ ] iOS/Android Store Submission
