# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation app from the TRUCKER-NAV-By-TUE repository. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. Features: high-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, customizable UI/HUD layouts, multi-user support, and timed guest sessions.

## Core Architecture
- **Frontend**: React (Vite) + TypeScript, HERE Maps JS API v3 (replaced Leaflet), Mapbox GL JS (3D satellite view)
- **Backend**: Node.js/Express (`server.ts`) on port 8001 with Vite dev server middleware
- **Database**: Firebase Firestore (user profiles), LocalStorage (HUD layout, guest settings)
- **Maps**: HERE Maps JS API v3 (primary 2D), Mapbox GL JS (3D satellite), HERE Routing API v8.140.0

## Key Technical Stack
- HERE Maps JS API v3 (`H.Map`, `H.mapevents.Behavior`, `H.ui.UI`) — Replaced Leaflet entirely
- MUTCD SVG Generation — Custom utility generating strict US DOT compliant vector signs
- HUD Layout Persistence — LocalStorage-based toggle system for 22 distinct map UI elements
- Firebase Auth — Google OAuth + email/password + guest sessions (2-hour limit)

## Completed Features
- [x] HERE Maps JS API v3 integration (replaced Leaflet) — Apr 6, 2026
- [x] Fixed route polyline rendering (lineDash/containsPoint errors) — Apr 6, 2026
- [x] Migrated useTrafficFlow, useRouteReasoning, useLaneVisualization hooks to HERE Maps — Apr 6, 2026
- [x] Fixed viewport bounds checking for sign placement — Apr 6, 2026
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
- [x] POI clustering (truck stops, fuel stations, rest areas)
- [x] HERE Routing API v8.140.0 truck routing
- [x] Compass rose and bearing orientation
- [x] Inline road name labels and highway emblems on polyline

## Known Issues
- Traffic flow overlay CORS: HERE traffic tiles (`traffic.vector.hereapi.com`) fail to load due to CORS — needs HERE API key domain whitelisting
- Gemini API key reported leaked (403) — TTS falls back to native speech synthesis
- Tangram tile parsing errors at high zoom (non-blocking)
- Intermittent `trucker-nav` service drops (manual restart via supervisorctl)

## Upcoming Tasks (P1)
- [ ] Verify all POI clustering renders correctly on HERE Map
- [ ] Refactor `NavigationView.tsx` (~6700 lines) into smaller hooks/components
- [ ] Speed limit warning system (flashes red + audio when exceeding posted speed)

## Future Tasks (P2)
- [ ] Apple Sign-In integration (requires Apple Developer credentials)
- [ ] PC*MILER Data integration (requires enterprise API access)
- [ ] Route Safety Score badge on map
- [ ] Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")
- [ ] Driver reputation/review system (truckers rate facilities)
- [ ] Viewport-based sign culling (DOM performance optimization)
- [ ] iOS and Android Store Submission Setup

## 3rd Party Integrations
| Service | Status | Key Source |
|---------|--------|-----------|
| HERE Maps JS API v3 | Active | User API Key in .env |
| HERE Routing API v8.140.0 | Active | User API Key in .env |
| Mapbox GL JS | Active (3D view) | User API Key in .env |
| Google Maps Places API | Active | User API Key in .env |
| Firebase Auth/Firestore | Active | serviceAccountKey.json |
| Google Gemini API | Degraded (403) | Emergent LLM Key |

## File Structure
```
/app/
├── components/
│   ├── NavigationView.tsx     # Core map UI (~6700 lines)
│   ├── MapControls.tsx        # Map UI toggles
│   ├── HudLayoutView.tsx      # Display/HUD customization
│   ├── SettingsView.tsx       # App settings
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── App.tsx                # Root component
├── hooks/
│   ├── useSignPlacement.ts    # MUTCD sign placement (HERE Maps)
│   ├── useTrafficFlow.ts      # Traffic flow overlay (HERE Maps)
│   ├── useRouteReasoning.ts   # Route reasoning overlay (HERE Maps)
│   ├── useLaneVisualization.ts # Lane visualization (HERE Maps)
├── utils/
│   ├── hereMapUtils.ts        # HERE JS API v3 utilities
│   ├── mutcdSigns.ts          # MUTCD-compliant SVG generation
│   ├── hudLayout.ts           # HUD config persistence
├── types/
│   ├── here-maps.d.ts         # HERE Maps TypeScript declarations
├── server.ts                  # Express backend + Vite middleware (port 8001)
├── index.html                 # HERE Maps script tags loaded here
```
