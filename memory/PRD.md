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

### Phase 8 — POI Filter Panel Brand Icons (DONE — 2026-03-25)
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

## Prioritized Backlog

### P1 — Upcoming
- Verify Home Depot / Lowe's only surface when truck parking is confirmed available
  (requires HERE API filter or Overpass `hgv_truck=yes` / `parking:condition` tag check)

### P2 — Upcoming  
- Validate Mapbox 3D camera tracking during active route movement

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
