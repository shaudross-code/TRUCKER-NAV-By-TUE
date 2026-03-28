# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities into single location icons, fix UI/map bugs, and add specific truck service POIs to the map and sidebar filter. Product requirements include turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D and 2D map views, and mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Firestore + localStorage for filters/waypoints + local JSON file DBs
- **APIs**: HERE Maps (Browse + Discover), Google Maps Platform, MapTiler, Gemini, Mapbox

## What's Been Implemented

### Phase 1 — Core Navigation (DONE)
- Truck-specific GPS routing via HERE Maps API
- Turn-by-turn real-time updates (2s throttle)
- Reroute & Clear buttons in navigation bar
- North-up / heading-up toggle

### Phase 2 — POI System (DONE — Enhanced 2026-03-28)
- **HERE Browse API**: Fetches fueling stations, rest areas, weigh stations, truck service centers (categories: 700-7600-0116, 700-7600-0117, 700-7600-0322, 700-7900-0132)
- **HERE Discover API**: Accurate keyword-based truck stop search + individual brand queries (Love's, Pilot/Flying J, Petro, TA, Cat Scale, Speedco, Blue Beacon)
- POI count improved from 99 → 361 (3.6x more accurate truck-specific POIs)
- Position-based deduplication (4-decimal precision ≈ 11m)
- Enhanced type classification: `major_chains` (travel centers), `service` (truck services/Cat Scale), `rest_area`, `weigh_station`, `fuel`, `distribution`, `low_clearance`
- Brand-specific amenity sets (Love's gets Diesel/DEF/Showers/Laundry/Scales/WiFi/Food)
- Filter panel with toggle for all POI categories

### Phase 3 — Traffic Infrastructure (DONE)
- Real-time traffic signs/lights alerts (trafficInfrastructure.ts)
- Audio speech alerts via Gemini TTS
- Low Clearance POIs with animated warning icons

### Phase 4 — 3D Navigation (DONE — Enhanced 2026-03-28)
- Mapbox GL JS 3D driver perspective view (Navigation3DView.tsx)
- `navigation-night-v1` Mapbox style for realistic dark road rendering (MapTiler dark fallback)
- 3D gold truck marker with cab/trailer detail
- Glowing blue route line (3-layer: glow + main + center)
- Gold turn instruction banner at top with direction arrow
- Speed limit sign overlay + current speed (turns red when over limit)
- Bottom navigation bar with Speed, Distance, Time, ETA, and street name
- Cancel/Reroute buttons accessible in 3D mode
- 3D buildings with fill-extrusion, atmospheric fog
- 2D HUD automatically hidden in 3D mode

### Phase 5 — Mobile Setup (DONE)
- Capacitor v6.2.0 initialized for iOS + Android

### Phase 11 — Load Board (DONE)
- Dynamic loads near GPS location with haversine filter

### Phase 16 — Facility POI System (DONE)
- Facility POI (Shipper/Receiver/Warehouse) with crowd-sourced driver reports
- CompassRose overlay, touch rotation, device compass mode

### Phase 17 — Reputation Scoring System (DONE)
- Facility + Truck Stop reputation scores (0-5 stars) in POI popups
- Backend scoring: `calcFacilityReputationScore()` in server.ts

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (show only 4-star+ facilities)

### P2 — Future
- iOS/Android store submissions (blocked: user signing certificates)

## Key Files
- `/app/server.ts` — Express server, Browse/Discover API proxy, facility/parking endpoints
- `/app/services/geminiService.ts` — HERE API POI fetching (Browse + Discover), type classification
- `/app/components/Navigation3DView.tsx` — Premium 3D navigation view
- `/app/components/NavigationView.tsx` — Core map orchestration (2D + 3D wrapper)
- `/app/components/ReputationScore.tsx` — Reputation star rating components
- `/app/components/FacilityPanel.tsx` — Facility detail/reporting panel
- `/app/components/MapControls.tsx` — Filter panel + map buttons
