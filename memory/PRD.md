# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app. Features: HERE Maps satellite hybrid, turn-by-turn navigation, real-time hazard alerts, MUTCD road signs, customizable HUD layouts, POI clustering, multi-user support, guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware (dev) / static dist serving (prod)
- **Database**: Firebase Firestore (user profiles), LocalStorage (anonymous profiles, HUD layout, driver profile)
- **Maps**: HERE logistics.satellite.day tiles (vehicle_restrictions, ppi=400, flat default + tilt toggle) + Mapbox satellite-streets-v12 (SAT 2D)
- **Deployment**: `yarn start` runs `vite build && NODE_ENV=production tsx server.ts` — builds frontend then serves from `/app/dist/`

## Completed Features
- [x] All navigation, POI, HUD, profile features (see previous sessions)
- [x] POI Panel independent from weather swipe overlay
- [x] Compass Rose hidden by default
- [x] Truck Profile save bug fixed (localStorage persistence for anonymous users)
- [x] User icon stationary spin fixed
- [x] **Deployment Fix**: tsx moved to dependencies, start script builds frontend first, explicit outDir, production domain added to Firebase Auth — Apr 9

## Known Issues
- Gemini TTS key degraded (403) — falls back to native speech
- Overpass API 504 timeouts (intermittent corridor POI fetch)

## Upcoming Tasks (P1)
- [ ] Refactor NavigationView.tsx (~7000 lines) into smaller hooks/components
- [ ] Speed limit warning system (red flash + audio when exceeding)

## Future Tasks (P2)
- [ ] Viewport-based sign culling, Apple Sign-In, PC*MILER Data
- [ ] Route Safety Score, Driver review system, iOS/Android submission
