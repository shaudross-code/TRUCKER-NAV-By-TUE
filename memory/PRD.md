# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, fix UI/map bugs, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, premium 3D and 2D map views, interactive Load Board, fuel price tracking, and a robust crowd-sourced data system for parking statuses and shipper/receiver facilities. Mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Auth (USE_MOCK_DATA=false) + localStorage + local JSON file DBs
- **APIs**: HERE Maps (Browse + Discover + Fuel Prices), Google Maps Platform, MapTiler, Gemini, Mapbox
- **Proxy**: Nginx on port 3000 → Express on port 8001

## What's Been Implemented

### Phase 1 — Core Navigation (DONE)
- Truck-specific GPS routing via HERE Maps API, turn-by-turn, reroute

### Phase 2 — POI System (DONE — Enhanced 2026-03-28)
- HERE Browse + Discover APIs for 361+ truck-specific POIs
- Route Corridor Search: samples every ~25 miles, 16km radius

### Phase 3 — Traffic Infrastructure (DONE)
- Real-time traffic signs/lights alerts + audio speech alerts

### Phase 4 — 3D Navigation (DONE — Enhanced 2026-03-28)
- Premium Mapbox GL JS 3D view matching reference images

### Phase 5 — Mobile Setup (DONE)
- Capacitor v6.2.0 for iOS + Android

### Phase 11 — Load Board (DONE)
- Dynamic loads near GPS with haversine filter

### Phase 16 — Facility POI System (DONE)
- Crowd-sourced Shipper/Receiver reporting

### Phase 17 — Reputation Scoring System (DONE)
- Facility + Truck Stop reputation scores (0-5 stars) in POI popups

### Phase 18 — Diesel Fuel Prices (DONE — 2026-03-28)
- HERE Fuel Prices API: Real-time diesel prices

### Phase 19 — Deployment Build Fix (DONE — 2026-03-29)
- Created `build-frontend-artifacts.sh` with relative path detection
- Cleaned corrupted `.gitignore`
- Added env-var fallback for Firebase Admin SDK
- Restored Nginx proxy (port 3000 → 8001)

### Phase 20 — Location & Map Reliability Fixes (DONE — 2026-03-29)
- **IP Geolocation Fallback**: Added `/api/ip-location` endpoint using ip-api.com
  - When browser geolocation is denied/unavailable, app auto-falls back to IP-based location
  - Shows approximate city/region instead of defaulting to Kansas center
- **Permissions-Policy Header**: Server now sends `Permissions-Policy: geolocation=(self)` for proper iframe support
- **3D→2D Map Switch Fix**: Added useEffect that detects 3D→2D transition, destroys stale Leaflet instance, resets all refs, re-initializes map
- **Error State Separation**: Split `error` into `mapInitError` (fatal, full-screen) and `error` (dismissible toast) so navigation warnings don't block the entire map
- **Firebase Auth Domain**: Auto-registers preview domain on server startup via Identity Toolkit API

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (show only 4-star+ facilities)

### P2 — Future
- Refactor `NavigationView.tsx` (>5000 lines → smaller sub-components)
- iOS/Android store submissions (blocked: user signing certificates)

## Key Files
- `/app/server.ts` — Express server, API proxy endpoints, IP geolocation
- `/app/build-frontend-artifacts.sh` — CI/CD frontend build script
- `/app/App.tsx` — Location provider with IP fallback
- `/app/components/NavigationView.tsx` — Core map orchestration (needs refactoring)
- `/app/components/Navigation3DView.tsx` — Premium 3D navigation
- `/app/services/geminiService.ts` — POI fetching (Browse + Discover)
- `/app/services/fuelPriceService.ts` — Diesel fuel price fetching + matching
