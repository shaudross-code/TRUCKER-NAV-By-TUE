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
- **Preview URL**: https://trucker-dashboard-3.preview.emergentagent.com

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
