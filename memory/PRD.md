# TRUCKERS NAV By TUE - Product Requirements

## Core Vision
Professional trucking GPS navigation app with real POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, satellite maps, MUTCD-compliant road signs, and customizable UI/HUD layouts. Signature gold (#D4AF37) and black theme throughout.

## Tech Stack
- Frontend: React + TypeScript (Vite), Mapbox GL JS v3.20.0, Tailwind CSS
- Backend: Node.js + Express (server.ts on port 8001)
- Auth: Firebase (Anonymous + Email)
- Storage: Firestore + LocalStorage fallback (localStorage is primary store)
- APIs: Mapbox (Map rendering + Directions + Geocoding), HERE Maps (Routing v8 + Traffic — backend, currently 403), Google Gemini (TTS)

## Completed Features
- Core navigation with HERE truck routing v8 (backend proxy)
- Mapbox GL JS map rendering (satellite-streets-v12 with gold/dark CSS filter)
- **Mapbox Directions API fallback** when HERE routing fails
- **Mapbox Geocoding fallback** when HERE search/autosuggest fails
- MUTCD-compliant SVG road signs (Interstate shields, US Routes, Speed Limits, Truck Warnings)
- Professional NavigationHUD with distance-urgency color coding (far→approaching→close→immediate→NOW)
- **Next Maneuver Preview panel** — shows upcoming 3 turns with road names and distances
- **Speed Warning Overlay** — red border flash + "REDUCE SPEED" banner when exceeding limit
- **Grade Warning Banner** — alerts for steep grades with gear-down recommendations
- **Arrival Countdown** — final mile approach with distance countdown
- **Route Progress Bar** on bottom trip bar
- Real-time traffic incident overlays + auto-reroute
- Route Comparison Panel with smart tags
- Waypoint system (DEADHEAD/PAID stops)
- POI system with 40+ branded truck stop icons (clickable with pointerEvents: auto)
- Weather overlay with 3-day forecast
- Driver/Truck profiles with license plates, trailers (save to localStorage + Firestore)
- HUD Layout customization (Display tab)
- Lane guidance visualization with gold theme
- Compass rose + Mapbox native bearing (heading-up mode uses setBearing, not CSS rotation)
- Voice announcements (TTS) with imperial units
- Guest login with localStorage persistence
- Traffic sign deduplication: max 2 lights + 2 stop signs, 100m intersection clustering
- 3D Mapbox Navigation mode with separate HUD

## Recently Completed (Apr 2026)
- **Bridge/Overpass Height Warnings + Weight Limit Alerts** (P1):
  - Overpass API fetches low-clearance bridges and weight-restricted roads along route corridor
  - 250m corridor filter ensures only relevant restrictions are shown
  - Restriction panel shows alerts (7 bridges, 21 weight limits on test route)
  - Proximity warnings: BridgeHeightWarning overlay (red for clearance violation, amber for tight fit)
  - Proximity warnings: WeightLimitWarning overlay (red for overweight, orange for near-limit)
  - Voice announcements within 0.5 miles of restrictions
  - New service: /app/services/routeRestrictions.ts (Overpass API, OSM tag parsing)
  - Alerts cleared on route cancellation
- **Professional-Grade CMV Navigation System Upgrade**:
  - NextManeuverPreview: Shows upcoming 3 turns with road names, distances, and direction icons
  - SpeedWarningOverlay: Red border flash with "REDUCE SPEED — X mph over limit" banner
  - GradeWarningBanner: Amber/red alerts for steep grades
  - ArrivalCountdown: Final mile approach with ft countdown and progress bar
  - Enhanced NavigationHUD: 5-level urgency color coding (far/approaching/close/immediate/now) with pulsing indicator
  - Route Progress Bar on bottom trip bar
  - Mapbox Directions API fallback routing (replaces offline straight-line when HERE fails)
  - Mapbox Geocoding fallback search (replaces empty results when HERE autosuggest fails)
  - Fixed route crash when alerts/restrictions are null (offline/fallback routes)
  - Fixed truckProfile crash when undefined in /api/route
- **Heading Up + Follow Me Fix**: Replaced CSS rotation with Mapbox native setBearing()
- **Traffic Signs Deduplication**: Max 2 each per type, 100m intersection clustering
- **Profile Save Fix**: localStorage as primary store for all user types
- **POI Clickability Fix**: pointerEvents: auto on cluster markers

## Upcoming Tasks
- P1: Refactor NavigationView.tsx (~7300 lines) into smaller hooks/sub-components
- P1: Truck Restriction Overlays (no-truck zones, mandatory weigh stations)

## Future/Backlog
- P2: Truck Restriction Overlays (no-truck zones, mandatory weigh stations)
- P2: Night Mode Auto-Dimming (time-based HUD brightness)
- P2: Viewport-based sign culling
- P2: Driver reputation/review system
- P2: Apple Sign-In Integration
- P2: PC*MILER Data integration
- P2: Route Safety Score badge

## Known Issues
- HERE Routing/Search API returning 403 (credentials issue) — app falls back to Mapbox
- Gemini TTS API key flagged (403) — falls back to native TTS
- Intermittent service drops (trucker-nav/frontend) requiring supervisor restart
- nginx config resets on pod restart (must reconfigure port 3000→8001 proxy)
