# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app. Features: HERE Maps satellite hybrid, turn-by-turn navigation, real-time hazard alerts, MUTCD road signs, customizable HUD layouts, POI clustering, multi-user support, guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware
- **Database**: Firebase Firestore (user profiles), LocalStorage (HUD layout, guest settings)
- **Maps**: HERE logistics.satellite.day tiles (vehicle_restrictions, ppi=400, flat default + tilt toggle) + Mapbox satellite-streets-v12 (SAT 2D)

## Completed Features
- [x] HERE Maps JS API v3.1 (replaced Leaflet) — Apr 6
- [x] HERE logistics.satellite.day hybrid tiles — Apr 6
- [x] Converted Mapbox 3D to 2D SAT view — Apr 6
- [x] H.clustering.Provider POI clustering — Apr 6
- [x] Fixed user location icon jitter (lerp, dead-zone) — Apr 6
- [x] Simplified MapControls: 7+ buttons — Apr 6
- [x] POI panel: collapsible, scrollable, click-to-center — Apr 6
- [x] Removed weigh stations from POI — Apr 6
- [x] Vehicle restrictions overlay (no-truck, weight limits, height) — Apr 9
- [x] High-res tiles (ppi=400) — Apr 9
- [x] Removed CSS tint/filter classes — Apr 9
- [x] Explicit z-index layering: routes(100) < facilities(200) < signs(900) — Apr 9
- [x] Removed default 55deg tilt — flat by default — Apr 9
- [x] Added tilt toggle button (Mountain icon) — Apr 9
- [x] Fixed user icon spinning: DomIcon element ref fix + CMV-grade heading stabilization — Apr 9
- [x] Auto-responsive UI scaling (screenScale 0.6-1.0 based on viewport + orientation) — Apr 9
- [x] Weather overlay swipe-to-dismiss + Cloud icon restore button — Apr 9
- [x] All route POIs displayed (removed 6-POI cap, full route search, sorted by routeIdx) — Apr 9
- [x] Fixed zoom buttons for HERE Maps API (setZoom instead of zoomIn/Out) — Apr 9
- [x] Turn-by-turn navigation with voice + route comparison
- [x] MUTCD road signs (Interstate shields, Speed Limits, Truck Warnings)
- [x] Real-time truck restrictions and toll warnings
- [x] Weather widget with 3-day forecast
- [x] Customizable HUD Layout (Display tab) — 22 toggleable elements
- [x] Traffic incident overlays + auto-reroute countdown
- [x] Guest login + Google Sign-In + 2-hour session timer
- [x] HERE Routing API v8.140.0 truck routing
- [x] Nginx proxy config (port 3000 to 8001)

## Known Issues
- Gemini TTS key degraded (403) — falls back to native speech
- Overpass API 504 timeouts (intermittent corridor POI fetch)
- Intermittent trucker-nav service drops

## Upcoming Tasks (P1)
- [ ] Refactor NavigationView.tsx (~6800 lines) into smaller hooks/components
- [ ] Speed limit warning system (red flash + audio when exceeding)
- [ ] Viewport-based sign culling for DOM performance

## Future Tasks (P2)
- [ ] Apple Sign-In, PC*MILER Data, Route Safety Score
- [ ] Map filtering for Reputation Scores, Driver review system
- [ ] iOS/Android Store Submission
