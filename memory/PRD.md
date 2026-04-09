# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app. Features: HERE Maps satellite hybrid, turn-by-turn navigation, real-time hazard alerts, MUTCD road signs, customizable HUD layouts, POI clustering, multi-user support, guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware
- **Database**: Firebase Firestore (user profiles), LocalStorage (anonymous profiles, HUD layout, driver profile)
- **Maps**: HERE logistics.satellite.day tiles (vehicle_restrictions, ppi=400, flat default + tilt toggle) + Mapbox satellite-streets-v12 (SAT 2D)

## Completed Features
- [x] HERE Maps JS API v3.1 with logistics.satellite.day + vehicle restrictions
- [x] Custom truck routing via HERE Routing API v8.140.0
- [x] MUTCD-compliant vector road signs (shields, speed limits, warnings)
- [x] Customizable HUD Layout (Display tab) with 18 toggleable elements
- [x] Turn-by-turn navigation with voice + route comparison
- [x] Real-time traffic incident overlays + auto-reroute countdown
- [x] POI clustering, fuel stations, rest stops, exits with nearest exit info
- [x] Weather overlay with swipe-to-dismiss + restore
- [x] Auto-responsive UI scaling (viewport + orientation)
- [x] Guest login + Google Sign-In + 2-hour session timer
- [x] Sign Clutter Fix (thinSigns utility) + Route Overview Button
- [x] Search Results above Recommendations + START NAV gold button
- [x] Truck Profile: Full modal with Make/Model/Year, Truck#/Trailer#, License Plates, Dimensions, Hazmat
- [x] Driver Profile: Name, Phone, Email, CDL, License Expiry, License Plate
- [x] Route Comparison Smart Tags (Fastest/Cheapest/Slowest/Most Expensive/Shortest/No Tolls)
- [x] POI Panel shows nearest highway exit for each POI
- [x] Removed road labels & direction badges from map overlay
- [x] Truck Profile Save Bug Fixed (anonymous profiles persist to localStorage via FirebaseProvider)
- [x] User Icon Stationary Spin Fixed (heading FREEZES when speed < 1 mph + dynamic dead zone)
- [x] **POI Panel Independent from Weather Swipe** — extracted to own positioned container with touch propagation stopped — Apr 9
- [x] **Compass Rose Hidden by Default** — showCompassRose: false in hudLayout.ts — Apr 9

## Known Issues
- Gemini TTS key degraded (403) — falls back to native speech synthesis
- Overpass API 504 timeouts (intermittent corridor POI fetch)
- Intermittent supervisor service drops (manual restart)

## Upcoming Tasks (P1)
- [ ] Refactor NavigationView.tsx (~7000 lines) into smaller hooks/components
- [ ] Speed limit warning system (red flash + audio when exceeding)
- [ ] Viewport-based sign culling for DOM performance

## Future Tasks (P2)
- [ ] Apple Sign-In, PC*MILER Data, Route Safety Score
- [ ] Map filtering for Reputation Scores, Driver review system
- [ ] iOS/Android Store Submission
