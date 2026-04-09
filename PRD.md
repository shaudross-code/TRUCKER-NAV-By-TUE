# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities into single location icons, fix UI/map bugs, and add specific truck service POIs to the map and sidebar filter. Product requirements include turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D and 2D map views, and mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Firestore + localStorage for filters/waypoints + local JSON file DBs
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

### Phase 4 — 3D Navigation (DONE — Enhanced 2026-03-28)
- Mapbox GL JS 3D driver perspective view (Navigation3DView.tsx)
- Uses `navigation-night-v1` style for realistic dark road rendering (falls back to MapTiler dark)
- 3D gold truck marker with cab/trailer detail
- Glowing blue route line (3-layer: glow + main + center)
- Gold turn instruction banner at top with direction arrow
- Speed limit sign overlay
- Current speed display (turns red when over limit)
- Bottom navigation bar with Speed, Distance, Time, ETA, and street name
- Cancel/Reroute buttons accessible in 3D mode
- 3D buildings with fill-extrusion
- Atmospheric fog and star effects
- 2D HUD automatically hidden in 3D mode to prevent overlap
- 2D/3D toggle button in map controls

### Phase 5 — Mobile Setup (DONE)
- Capacitor v6.2.0 initialized for iOS + Android
- App Store icons and screenshots generated (store-assets/)
- Firebase Admin SDK configured via serviceAccountKey.json

### Phase 11 — Load Board (DONE — 2026-03-25)
- Dynamic loads near GPS location with haversine filter
- Editable RPM Target and Max Weight with persistence
- Distance badges, stats bar, auto-refresh

### Phase 16 — Facility POI System (DONE — 2026-03-26)
- Facility POI type on map (Shipper blue, Receiver green, Both purple)
- Google Places API seed for warehouses/distribution centers
- Manual facility add, crowd-sourced driver reports (majority vote)
- FacilityPanel slide-up modal with full reporting form
- CompassRose overlay, touch rotation, device compass mode
- Parking Confidence Indicator for distribution POIs
- 3D Camera Tracking via TelemetryContext

### Phase 17 — Reputation Scoring System (DONE — 2026-03-26)
- Facility Reputation Score: Calculated from crowd-sourced driver reports (loading speed, unloading speed, parking allowed, overnight parking)
- Truck Stop Reputation Score: Calculated from parking status data (light=4.5, medium=3.2, heavy=2.0, maxed=1.0)
- Backend: `calcFacilityReputationScore()` in server.ts, returned in both facility and parking endpoints
- Frontend: ReputationScore.tsx with star display, confidence badges, trend indicators

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

### P2 — Future
- Final App Store (Apple) and Google Play submissions
  - Blocked: user must generate signing certificates (see /app/SIGNING_GUIDE.md)

## Known Issues
- Platform preview URL requires manual wake via Emergent Dashboard (ingress cache)
- NavigationView.tsx is 5000+ lines — candidate for future refactor
- Mapbox `navigation-night-v1` style may be blocked in Emergent preview sandbox — falls back to MapTiler dark style automatically

## Key Files
- `/app/components/Navigation3DView.tsx` — premium 3D navigation view (gold theme, truck marker, glowing route)
- `/app/components/NavigationView.tsx` — core map + POI orchestration (2D mode + 3D wrapper)
- `/app/components/ReputationScore.tsx` — reputation star rating components
- `/app/components/FacilityPanel.tsx` — facility detail/reporting panel
- `/app/components/MapControls.tsx` — filter panel + map buttons
- `/app/components/CompassRose.tsx` — compass overlay
- `/app/services/geminiService.ts` — HERE API POI fetching
- `/app/services/facilityService.ts` — facility API calls + types
- `/app/services/trafficInfrastructure.ts` — traffic alerts
- `/app/server.ts` — Express server on port 8001
