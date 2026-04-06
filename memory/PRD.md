# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app from the TRUCKER-NAV-By-TUE repository. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. Features: high-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, customizable UI/HUD layouts, multi-user support, and timed guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3.1, Mapbox GL JS (SAT 2D view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware
- **Database**: Firebase Firestore (user profiles), LocalStorage (HUD layout, guest settings)
- **Maps**: HERE Maps JS API v3.1 (logistics.satellite.day tiles + 55° tilt) + Mapbox satellite-streets-v12 (SAT 2D)

## Key Technical Stack
- HERE Raster Tile API v3 — `logistics.satellite.day` hybrid tiles (satellite + logistics road overlay)
- HERE Maps JS API v3.1 — H.Map, H.mapevents.Behavior, H.ui.UI, H.clustering.Provider
- CSS canvas filter for dark-gold signature theme: `brightness(0.65) contrast(1.25) saturate(0.65) sepia(0.3) hue-rotate(-5deg)`
- 55° map tilt for cinematic trucking GPS perspective (range: 45-80°)
- Mapbox GL JS satellite-streets-v12 with pitch:55 for SAT 2D alternate view
- MUTCD SVG Generation — Custom utility generating strict US DOT compliant vector signs
- HUD Layout Persistence — LocalStorage-based toggle system for 22 distinct map UI elements
- Firebase Auth — Google OAuth + email/password + guest sessions (2-hour limit)
- H.clustering.Provider with gold/black SVG cluster theme for POI grouping

## Completed Features
- [x] HERE Maps JS API v3.1 integration (replaced Leaflet) — Apr 6, 2026
- [x] Fixed route polyline rendering (lineDash/containsPoint errors) — Apr 6, 2026
- [x] Migrated useTrafficFlow, useRouteReasoning, useLaneVisualization hooks to HERE Maps — Apr 6, 2026
- [x] HERE logistics.satellite.day hybrid tiles with new API key — Apr 6, 2026
- [x] 55° map tilt for cinematic trucking GPS perspective — Apr 6, 2026
- [x] Converted Mapbox 3D view to 2D SAT view with pitch:55 — Apr 6, 2026
- [x] H.clustering.Provider POI clustering with gold/black SVG badge theme — Apr 6, 2026
- [x] HERE/SAT toggle in MapControls (replaces old 2D/3D) — Apr 6, 2026
- [x] Dark-gold CSS filter for TRUCKERS NAV BY TUE signature branding — Apr 6, 2026
- [x] Turn-by-turn navigation with voice announcements
- [x] Route comparison (3 alternative routes with ETA, distance, fuel cost)
- [x] Real-time truck restrictions and toll warnings
- [x] MUTCD-compliant road signs (Interstate shields, US Routes, Speed Limits, Truck Warnings)
- [x] Weather widget with 3-day forecast
- [x] Customizable HUD Layout (Display tab) — 22 toggleable UI elements
- [x] Real-time traffic incident overlays + auto-reroute countdown
- [x] Collapsible map controls
- [x] Waypoint numbered markers
- [x] Guest login with 2-hour session timer
- [x] Google Sign-In authentication
- [x] HERE Routing API v8.140.0 truck routing
- [x] Compass rose and bearing orientation

## Known Issues
- Gemini API key reported leaked (403) — TTS falls back to native speech synthesis
- Overpass API 504 timeouts when fetching POI data along route corridor (intermittent)
- Intermittent trucker-nav service drops (manual restart via supervisorctl)

## Upcoming Tasks (P1)
- [ ] Refactor `NavigationView.tsx` (~6700 lines) into smaller hooks/components
- [ ] Speed limit warning system (flashes red + audio when exceeding posted speed)
- [ ] Viewport-based sign culling for DOM performance

## Future Tasks (P2)
- [ ] Apple Sign-In integration (requires Apple Developer credentials)
- [ ] PC*MILER Data integration (requires enterprise API access)
- [ ] Route Safety Score badge on map
- [ ] Map filtering for Reputation Scores
- [ ] Driver reputation/review system
- [ ] iOS and Android Store Submission Setup

## 3rd Party Integrations
| Service | Status | Key Source |
|---------|--------|-----------|
| HERE Maps JS API v3.1 | Active (map engine) | CDN script tags |
| HERE Raster Tile API v3 | Active (logistics.satellite.day) | New API Key in hereMapUtils.ts |
| HERE Routing API v8.140.0 | Active | .env HERE_API_KEY |
| Mapbox GL JS | Active (SAT 2D view) | .env MAPBOX_ACCESS_TOKEN |
| Google Maps Places API | Active | .env GOOGLE_MAPS_API_KEY |
| Firebase Auth/Firestore | Active | serviceAccountKey.json |
| Google Gemini API | Degraded (403) | Emergent LLM Key |

## File Structure
```
/app/
├── components/
│   ├── NavigationView.tsx     # Core map UI (~6700 lines)
│   ├── Navigation3DView.tsx   # Mapbox 2D SAT view (converted from 3D)
│   ├── MapControls.tsx        # HERE/SAT toggle + zoom/compass
│   ├── HudLayoutView.tsx      # Display/HUD customization
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── App.tsx                # Root component
├── hooks/
│   ├── useSignPlacement.ts    # MUTCD sign placement (HERE Maps)
│   ├── useTrafficFlow.ts      # Traffic flow overlay (HERE Maps)
│   ├── useRouteReasoning.ts   # Route reasoning overlay (HERE Maps)
│   ├── useLaneVisualization.ts # Lane visualization (HERE Maps)
├── utils/
│   ├── hereMapUtils.ts        # HERE JS API v3.1 utilities + logistics.satellite.day + clustering
│   ├── mutcdSigns.ts          # MUTCD-compliant SVG generation
│   ├── hudLayout.ts           # HUD config persistence
├── types/
│   ├── here-maps.d.ts         # HERE Maps + clustering TypeScript declarations
├── server.ts                  # Express backend + Vite middleware (port 8001)
├── index.html                 # HERE Maps scripts + clustering + CSS dark-gold filter
```
