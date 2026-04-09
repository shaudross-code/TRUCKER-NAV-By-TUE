# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app. Features: HERE Maps satellite hybrid, turn-by-turn navigation, real-time hazard alerts, MUTCD road signs, customizable HUD layouts, POI clustering, multi-user support, guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware
- **Database**: Firebase Firestore (user profiles), LocalStorage (HUD layout, guest settings, driver profile, truck profile)
- **Maps**: HERE logistics.satellite.day tiles (vehicle_restrictions, ppi=400, flat default + tilt toggle, no CSS tint) + Mapbox satellite-streets-v12 (SAT 2D)

## Completed Features
- [x] HERE Maps JS API v3.1 with logistics.satellite.day + vehicle restrictions
- [x] Custom truck routing via HERE Routing API v8.140.0
- [x] MUTCD-compliant vector road signs (shields, speed limits, warnings)
- [x] Customizable HUD Layout (Display tab) with 18 toggleable elements
- [x] Turn-by-turn navigation with voice + route comparison
- [x] Real-time traffic incident overlays + auto-reroute countdown
- [x] POI clustering (H.clustering.Provider), fuel stations, rest stops, exits
- [x] Weather overlay with swipe-to-dismiss + restore button
- [x] Auto-responsive UI scaling (viewport + orientation)
- [x] Guest login + Google Sign-In + 2-hour session timer
- [x] Sign Clutter Fix (thinSigns utility prevents app crash on long routes)
- [x] Search Results above Recommendations when typing
- [x] START NAV gold button in route comparison panel
- [x] User Icon Spin Fix (compass mode sync, 5-degree dead zone, 0.8s transition)
- [x] Route Overview Button (Maximize2 icon, fits route bounds)
- [x] **Truck Profile "0" Bug Fix** — numeric defaults prevent 0/NaN values — Apr 9
- [x] **Truck & Trailer Numbers + License Plates** — new fields in TruckProfileModal — Apr 9
- [x] **Driver License Plate** — new field in DriverProfileModal — Apr 9
- [x] **Route Comparison Smart Tags** — Fastest/Cheapest/Slowest/Most Expensive/Shortest/No Tolls with cost/time diffs — Apr 9
- [x] **POI Panel Nearest Exit** — each POI shows its nearest highway exit — Apr 9
- [x] **Removed Road Labels & Direction Badges** — cleaned map overlay of confusing N/S/E/W labels — Apr 9

## Known Issues
- Gemini TTS key degraded (403) — falls back to native speech synthesis
- Overpass API 504 timeouts (intermittent corridor POI fetch)
- Intermittent trucker-nav/frontend service drops (supervisor restart)
- HERE API tractorTruck vehicle type parameter issue (non-blocking)

## Upcoming Tasks (P1)
- [ ] Refactor NavigationView.tsx (~7000 lines) into smaller hooks/components
- [ ] Speed limit warning system (red flash + audio when exceeding)
- [ ] Viewport-based sign culling for DOM performance

## Future Tasks (P2)
- [ ] Apple Sign-In, PC*MILER Data, Route Safety Score
- [ ] Map filtering for Reputation Scores, Driver review system
- [ ] iOS/Android Store Submission
