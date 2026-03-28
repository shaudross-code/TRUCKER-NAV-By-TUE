# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities into single location icons, fix UI/map bugs, and add specific truck service POIs to the map and sidebar filter. Product requirements include turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D and 2D map views, and mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Firestore + localStorage + local JSON file DBs
- **APIs**: HERE Maps (Browse + Discover), Google Maps Platform, MapTiler, Gemini, Mapbox

## What's Been Implemented

### Phase 1 — Core Navigation (DONE)
- Truck-specific GPS routing via HERE Maps API
- Turn-by-turn real-time updates, Reroute & Clear

### Phase 2 — POI System (DONE — Enhanced 2026-03-28)
- HERE Browse API: Fuel stations, rest areas, weigh stations, truck services (100 results)
- HERE Discover API: Keyword-based truck stop search + individual brand queries
- **Route Corridor Search**: Samples every ~25 miles along active route, 16km radius per sample
- POI count: 361+ (radius) + corridor POIs for 377+ total along route
- Position-based deduplication, enhanced type classification
- "Along Route" panel showing 6 upcoming corridor POIs with distance

### Phase 3 — Traffic Infrastructure (DONE)
- Real-time traffic signs/lights alerts + audio speech alerts

### Phase 4 — 3D Navigation (DONE — Enhanced 2026-03-28)
- Mapbox GL JS premium 3D view: gold truck marker, glowing route line, turn banner
- navigation-night-v1 style, 3D buildings, atmospheric fog
- Bottom nav bar with Speed/Distance/Time/ETA
- Separate 2D/3D HUDs (no overlap)

### Phase 5 — Mobile Setup (DONE)
- Capacitor v6.2.0 for iOS + Android

### Phase 11 — Load Board (DONE)
- Dynamic loads near GPS with haversine filter

### Phase 16 — Facility POI System (DONE)
- Crowd-sourced Shipper/Receiver reporting

### Phase 17 — Reputation Scoring System (DONE)
- Facility + Truck Stop reputation scores (0-5 stars) in POI popups

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (show only 4-star+ facilities)

### P2 — Future
- iOS/Android store submissions (blocked: user signing certificates)

## Key Files
- `/app/server.ts` — Express server, Browse/Discover API proxy
- `/app/services/geminiService.ts` — fetchTruckPOIs, fetchCorridorPOIs
- `/app/components/Navigation3DView.tsx` — Premium 3D navigation
- `/app/components/NavigationView.tsx` — Core map orchestration
- `/app/components/ReputationScore.tsx` — Reputation stars
- `/app/components/FacilityPanel.tsx` — Facility reporting
