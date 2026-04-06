# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app. Features: HERE Maps satellite hybrid, turn-by-turn navigation, real-time hazard alerts, MUTCD road signs, customizable HUD layouts, POI clustering, multi-user support, guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware
- **Database**: Firebase Firestore (user profiles), LocalStorage (HUD layout, guest settings)
- **Maps**: HERE logistics.satellite.day tiles (55° tilt, native colors) + Mapbox satellite-streets-v12 (SAT 2D)

## Completed Features
- [x] HERE Maps JS API v3.1 (replaced Leaflet) — Apr 6, 2026
- [x] HERE logistics.satellite.day hybrid tiles with native colors (no CSS filter) — Apr 6, 2026
- [x] 55° map tilt for cinematic GPS perspective — Apr 6, 2026
- [x] Converted Mapbox 3D → 2D SAT view with pitch:55 — Apr 6, 2026
- [x] H.clustering.Provider POI clustering with gold/black SVG theme — Apr 6, 2026
- [x] Fixed user location icon jitter (lerp=0.06, dead-zone 0.5m, 20fps cap) — Apr 6, 2026
- [x] Simplified MapControls: 7 buttons only — Apr 6, 2026
- [x] Merged heading-up + follow-me into single default button — Apr 6, 2026
- [x] POI panel: collapsible header with count, scrollable — Apr 6, 2026
- [x] Removed weigh stations from POI — Apr 6, 2026
- [x] Turn-by-turn navigation with voice + route comparison (3 alternatives)
- [x] MUTCD road signs (Interstate shields, Speed Limits, Truck Warnings)
- [x] Real-time truck restrictions and toll warnings
- [x] Weather widget with 3-day forecast
- [x] Customizable HUD Layout (Display tab) — 22 toggleable elements
- [x] Traffic incident overlays + auto-reroute countdown
- [x] Guest login + Google Sign-In + 2-hour session timer
- [x] HERE Routing API v8.140.0 truck routing
- [x] Removed CSS dark-gold map tint — native HERE satellite colors — Apr 6, 2026
- [x] Signature gold/black theme on NavigationHUD Lane Guidance — Apr 6, 2026
- [x] Signature gold/black theme on Route Comparison Panel — Apr 6, 2026
- [x] Fixed truck profile defaults (13.5'/78500lbs/53'/8.5') — Apr 6, 2026
- [x] Fixed heading-up mode spinning when stationary (dead-zone 5m, speed gate 2mph) — Apr 6, 2026

## Known Issues
- Gemini TTS key degraded (403) — falls back to native speech
- Overpass API 504 timeouts (intermittent corridor POI fetch)
- Intermittent trucker-nav service drops

## Upcoming Tasks (P1)
- [ ] Refactor NavigationView.tsx (~6700 lines) into smaller hooks/components
- [ ] Speed limit warning system (red flash + audio when exceeding)
- [ ] Viewport-based sign culling for DOM performance

## Future Tasks (P2)
- [ ] Apple Sign-In, PC*MILER Data, Route Safety Score
- [ ] Map filtering for Reputation Scores, Driver review system
- [ ] iOS/Android Store Submission
