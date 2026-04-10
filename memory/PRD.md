# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app. Features: HERE Maps satellite hybrid, turn-by-turn navigation, real-time hazard alerts, MUTCD road signs, customizable HUD layouts, POI clustering, multi-user support, guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev middleware (dev) / static dist (prod)
- **Database**: Firebase Firestore (user profiles), LocalStorage (anonymous profiles, HUD layout)
- **Maps**: HERE logistics.satellite.day tiles (vehicle_restrictions, ppi=400) + Mapbox satellite-streets-v12
- **Deployment**: `yarn start` → `vite build && NODE_ENV=production tsx server.ts`

## Design Language
- **Navigation accent**: Vibrant pink #E259AD (route polyline, active lanes, ETA, distance)
- **Brand accent**: Gold #D4AF37 (sidebar, UI chrome, POI panel, weather, settings)
- **Surfaces**: Dark semi-transparent bg-[#1a1a2e]/92, backdrop-blur-2xl
- **Route polyline**: 3-layer — outer glow (28px, 18% opacity), dark border (16px), inner pink (10px)
- **User marker**: White triangular chevron with blue pulse ring
- **NavigationHUD**: Top-left absolute positioned, large maneuver arrow + distance + road name
- **Lane guidance**: Pink #E259AD active indicators, dark inactive

## Completed Features
- [x] All core navigation, POI, HUD, profile features
- [x] Truck/Driver profiles with numbers, plates, license info
- [x] Route Comparison with smart tags (Fastest/Cheapest/Slowest/No Tolls)
- [x] POI panel independent from weather swipe, shows nearest exit
- [x] User icon stability (10° dead zone, 1.5s tick rate, freeze at rest)
- [x] Deployment fix (tsx in deps, vite build in start script)
- [x] **Professional Navigation UI** — vibrant pink polyline, white user arrow, redesigned HUD, pink accent bottom bar — Apr 10

## Known Issues
- Gemini TTS key leaked (403) — falls back to native speech
- Nginx proxy.conf gets lost on supervisor restarts (recreate from /etc/nginx/conf.d/proxy.conf)

## Upcoming Tasks (P1)
- [ ] Refactor NavigationView.tsx (~7000 lines) into smaller hooks/components
- [ ] Speed limit warning system (red flash + audio when exceeding)

## Future Tasks (P2)
- [ ] Viewport-based sign culling, Apple Sign-In, PC*MILER Data
- [ ] Route Safety Score, Driver review system, iOS/Android submission
