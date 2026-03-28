# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities into single location icons, fix UI/map bugs, and add specific truck service POIs to the map and sidebar filter. Product requirements include turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D and 2D map views, and mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Auth (USE_MOCK_DATA=false) + localStorage + local JSON file DBs
- **APIs**: HERE Maps (Browse + Discover + Fuel Prices), Google Maps Platform, MapTiler, Gemini, Mapbox

## What's Been Implemented

### Phase 1 — Core Navigation (DONE)
- Truck-specific GPS routing via HERE Maps API, turn-by-turn, reroute

### Phase 2 — POI System (DONE — Enhanced 2026-03-28)
- HERE Browse + Discover APIs for 361+ truck-specific POIs
- Route Corridor Search: samples every ~25 miles, 16km radius
- Position-based deduplication, enhanced type classification
- "Along Route" panel showing 6 upcoming corridor POIs

### Phase 3 — Traffic Infrastructure (DONE)
- Real-time traffic signs/lights alerts + audio speech alerts

### Phase 4 — 3D Navigation (DONE — Enhanced 2026-03-28)
- Premium Mapbox GL JS 3D view matching reference images
- Gold truck marker, glowing route line, turn banner, bottom nav bar

### Phase 5 — Mobile Setup (DONE)
- Capacitor v6.2.0 for iOS + Android

### Phase 11 — Load Board (DONE)
- Dynamic loads near GPS with haversine filter

### Phase 16 — Facility POI System (DONE)
- Crowd-sourced Shipper/Receiver reporting

### Phase 17 — Reputation Scoring System (DONE)
- Facility + Truck Stop reputation scores (0-5 stars) in POI popups

### Phase 18 — Diesel Fuel Prices (DONE — 2026-03-28)
- **HERE Fuel Prices API**: Real-time diesel prices (fuelType=5) from `fuel.hereapi.com/v3/stations`
- **Backend**: `/api/fuel-prices` endpoint — filters diesel, returns price/gal, brand, coordinates
- **Corridor Fuel Search**: Samples route every ~50 miles, 50km radius per sample
- **POI Popup**: Diesel price banner with $/gal, "Best Price" tag for cheapest
- **Along Route Panel**: Green price tags on fuel POIs, "Best: $X.XX" cheapest fuel banner
- **15-minute cache** to avoid excessive API calls
- **500m proximity matching** between fuel stations and POI markers
- **Testing**: 17/17 backend tests passed (Chicago: 1,771 stations, 13 with diesel, cheapest $2.699/gal)

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (show only 4-star+ facilities)

### P2 — Future
- iOS/Android store submissions (blocked: user signing certificates)

## Key Files
- `/app/server.ts` — Express server, API proxy endpoints
- `/app/services/geminiService.ts` — POI fetching (Browse + Discover)
- `/app/services/fuelPriceService.ts` — Diesel fuel price fetching + matching
- `/app/services/facilityService.ts` — Facility API calls
- `/app/components/Navigation3DView.tsx` — Premium 3D navigation
- `/app/components/NavigationView.tsx` — Core map orchestration
- `/app/components/ReputationScore.tsx` — Reputation stars
- `/app/components/FacilityPanel.tsx` — Facility reporting
