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

### Phase 4 — 3D Navigation (DONE)
- Mapbox GL JS 3D driver perspective view (Navigation3DView.tsx)
- 2D/3D toggle button in map controls
- Fixed routePoints → routeCoordinates mapping bug

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
- **Facility Reputation Score**: Calculated from crowd-sourced driver reports (loading speed, unloading speed, parking allowed, overnight parking). Weighted average on 0-5 star scale with confidence indicator (low/medium/high based on report count).
- **Truck Stop Reputation Score**: Calculated from parking status data (light=4.5, medium=3.2, heavy=2.0, maxed=1.0) with amenity bonus. Includes "Driver Favorite" / "Solid Choice" / "Use with Caution" / "Avoid if Possible" labels.
- **Backend**: `calcFacilityReputationScore()` in server.ts, reputation_score returned in `buildMajority()` and parking-status endpoint
- **Frontend**: New `ReputationScore.tsx` component with `FacilityReputation` and `TruckStopReputation` sub-components
- **UI**: Star rating display with partial fill, trend indicator (up/down/flat), confidence badges, breakdown grid for facilities
- **Testing**: 13/13 backend tests passed, all data-testid attributes verified

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")
- Validate Mapbox 3D camera tracking during active navigation

### P2 — Future
- Final App Store (Apple) and Google Play submissions
  - Blocked: user must generate signing certificates (see /app/SIGNING_GUIDE.md)

## Known Issues
- Platform preview URL requires manual wake via Emergent Dashboard (ingress cache)
- NavigationView.tsx is 5000+ lines — candidate for future refactor
- Pre-existing: POI markers fetched but timing issue may prevent immediate rendering

## Key Files
- `/app/components/NavigationView.tsx` — core map + POI orchestration
- `/app/components/FacilityPanel.tsx` — facility detail/reporting panel
- `/app/components/ReputationScore.tsx` — reputation star rating components
- `/app/components/MapControls.tsx` — filter panel + map buttons
- `/app/components/PoiIcon.tsx` — brand icons + category detection
- `/app/components/Navigation3DView.tsx` — Mapbox 3D mode
- `/app/services/geminiService.ts` — HERE API POI fetching
- `/app/services/facilityService.ts` — facility API calls + types
- `/app/services/trafficInfrastructure.ts` — traffic alerts
- `/app/server.ts` — Express server on port 8001
