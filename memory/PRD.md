# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, fix UI/map bugs, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, premium 3D and 2D map views, interactive Load Board, fuel price tracking, and a robust crowd-sourced data system for parking statuses and shipper/receiver facilities. Mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D with CSS-based touch rotation) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Auth (USE_MOCK_DATA=false) + localStorage + local JSON file DBs
- **APIs**: HERE Maps (Browse + Discover + Fuel Prices), Google Maps Platform, MapTiler, Gemini, Mapbox, Nominatim (reverse geocoding)
- **Proxy**: Nginx on port 3000 -> Express on port 8001
- **Preview URL**: https://truck-gps-demo.preview.emergentagent.com

## What's Been Implemented

### Core Features (All DONE)
- Truck-specific GPS routing via HERE Maps API, turn-by-turn, reroute
- HERE Browse + Discover APIs for truck-specific POIs with corridor search
- Real-time traffic signs/lights alerts + audio speech alerts
- Premium Mapbox GL JS 3D view with night mode, gold truck, HUD
- Capacitor v6.2.0 for iOS + Android
- Dynamic Load Board near GPS with haversine filter
- Crowd-sourced Shipper/Receiver reporting
- Reputation scoring (0-5 stars) in POI popups
- HERE Fuel Prices API: Real-time diesel prices, corridor matching
- Firebase Auth (live)

### Phase 19-28 (Previously Completed)
- Deployment Build Fix, Location & Map Reliability, Touch Map Rotation
- POI Accuracy & Performance, Preview Fix & NavigationView Refactor
- Multi-Method Authentication (Google, Email/Password, Guest)
- Dashboard Input Cards Bug Fix (localStorage primary + Firestore sync)
- Bug Fix Sweep (Firestore spam, Truck Stops loading, Chart dimensions)
- Units & Display + Professional Lane Guidance
- Speed Limit & Map Orientation Fixes

### Phase 29 — State/Country Voice Prompts & Navigation UI Polish (DONE — 2026-03-30)
**State/Country Boundary Voice Prompts:**
- Added reverse geocoding via Nominatim API to detect current state/country/city
- Throttled to every 20 seconds or 3km of movement to respect rate limits
- Voice announcements via `speak()` when state or country changes: "Now entering {state}."
- Region data persisted in localStorage for continuity across sessions
- Previous region tracked in ref to prevent false positives on mount

**Navigation UI Polish:**
- Redesigned bottom arrival HUD with professional 2-row layout:
  - Top row: Region bar showing current road + highway shield + state indicator with green live dot
  - Bottom row: Clean stats — Speed, Distance, Time, ETA with tabular-nums font, compact speed limit sign
- Added idle-mode region indicator pill at bottom center (city, state + green dot)
- Polished search bar: cleaner border styling, backdrop blur, updated placeholder
- Waypoint cards: improved spacing, border accents, better typography
- Route button: conditional gold/dark styling, shadow effects
- Suggestions dropdown: matched styling with backdrop blur
- All interactive elements have data-testid attributes for testing

### Phase 30 — 3D View Bug Fixes (DONE — 2026-03-30)
- **CRITICAL FIX: Time display** — `formatTime()` was treating seconds as minutes (3600s showed as "60h" → now correctly shows "1h 0m")
- **Unit system support** — 3D view now respects user's imperial/metric preference for speed, distance, speed limit
- **Street name** — Bottom bar now shows actual road name (e.g. "W BROADWAY") instead of full instruction text
- **Region indicator** — Added road + state strip to 3D bottom HUD matching 2D view design (e.g. "W BROADWAY | IOWA")
- **Props fix** — 3D view now receives reactive `speed`, `currentRoad`, `unitSystem`, and `currentRegion` from parent

### Phase 31 — 3D Satellite Map + Truck Restriction Warnings (DONE — 2026-03-30)
- **Satellite map**: Switched 3D from `navigation-night-v1` to `satellite-streets-v12` with real aerial imagery, street labels, and 3D terrain elevation (mapbox-terrain-dem-v1)
- **Gold route line**: Route line changed from blue to gold (#D4AF37) for satellite visibility
- **Truck restriction warnings**: Active warning overlay pops up within 800m of low bridges or weight-restricted roads, showing restriction value, truck comparison, and distance
- **Restriction markers**: Red (bridge) / orange (weight) markers on 3D map with popups
- **Voice alerts**: `speak()` announces approaching restrictions (e.g. "Caution. Low bridge immediately ahead. Low Bridge: 12.5ft.")
- **Restriction count badge**: Shows total route restrictions at top-right when not near one

### Phase 32 — Hazmat Route Avoidance Mode (DONE — 2026-03-30)
- **Tunnel restriction detection**: Parses `tunnelCategory` from HERE API route spans; creates TUNNEL-type alerts with purple color when truck's ADR category is exceeded
- **Hazmat prohibited zone detection**: Parses `permittedHazardousGoods`/`hazardousGoods` from spans; creates HAZMAT-type alerts with yellow color when truck carries hazmat
- **3D map markers**: Tunnel restrictions show purple markers, hazmat zones show yellow markers with popup details
- **Active warning overlay**: Handles all 4 types (BRIDGE=red, WEIGHT=orange, TUNNEL=purple, HAZMAT=yellow) with type-specific icons, messages, and truck comparison info
- **Voice alerts**: Type-specific announcements ("Tunnel restriction ahead — check ADR classification", "Hazmat prohibited zone — seek alternate route")
- **2D restriction panel**: Updated to render TUNNEL and HAZMAT types alongside existing BRIDGE/WEIGHT
- **Settings integration**: Existing Hazmat Routing toggle, Tunnel Category (ADR), and Hazmat Classes settings drive the restriction detection logic

### Phase 33 — 3D Map Controls Fix + 2D Mapbox Migration (DONE — 2026-03-30)
- **3D map controls fixed**: Zoom +/-, follow user, and overview buttons now work in 3D mode by routing to the Mapbox GL map instance via `mapboxMapRef`
- **2D map switched to Mapbox**: `dark-v11` raster tiles via Leaflet's `L.tileLayer`, replacing MapTiler. Falls back to MapTiler then OSM if no Mapbox token
- **Navigation3DView exposes map**: New `onMapRef` callback prop passes the Mapbox GL map instance up to the parent
- **Overview mode in 3D**: Toggles pitch between 0 (flat overview) and 70 (navigation perspective)

### Phase 34 — POI Cleanup: Tesla/EV Removal + CAT Scale Separation (DONE — 2026-03-30)
- **Tesla/EV POIs removed**: Filters out Tesla Superchargers, ChargePoint, Electrify America, and all EV charging stations from both nearby and corridor POI lists — not relevant for trucking
- **CAT Scales separated**: New `cat_scale` POI type distinct from `weigh_station` (DOT weigh stations). Cyan icon (#0891b2) with "CAT" label vs green weigh station icon
- **Filter menu updated**: "Weigh Stations" and "CAT Scales" are now separate filter checkboxes
- **Both geminiService functions updated**: Local POIs (line 371) and corridor POIs (line 605) both filter out EV charging

### Phase 35 — Stop Sign Icon Fix + 3D Follow Mode Fix (DONE — 2026-03-30)
- **Stop sign icon**: Replaced lucide-react `Octagon` overlay with pure SVG `<polygon>` + `<text>` — text no longer renders behind the icon
- **Yield sign icon**: Same fix applied (pure SVG triangle with embedded text)
- **3D follow mode**: Added `pitch: 70` to `flyTo` call, passed `isFollowMode`/`isOverviewMode` to Navigation3DView — camera now correctly zooms in and tracks the truck icon
- **3D overview mode**: Properly toggles pitch between 0 (flat overview) and 70 (navigation tilt)

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (show only 4-star+ facilities)

### P2 — Future
- iOS/Android store submissions (blocked: user signing certificates)

## Key Files
- `/app/server.ts` — Express server, API proxy, IP geolocation
- `/app/App.tsx` — Location provider with IP fallback
- `/app/components/NavigationView.tsx` — Core map orchestration (state tracking + polished UI)
- `/app/components/NavigationHUD.tsx` — Navigation HUD with professional lane guidance
- `/app/components/SettingsView.tsx` — Settings with Units & Display section
- `/app/components/LoginScreen.tsx` — Multi-method login (Google, Email, Guest)
- `/app/services/speechService.ts` — Text-to-speech with queue system
