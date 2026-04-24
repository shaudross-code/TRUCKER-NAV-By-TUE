# TRUCKERS NAV By TUE - Product Requirements

## Core Vision
Professional trucking GPS navigation app with real POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, satellite maps, MUTCD-compliant road signs, and customizable UI/HUD layouts. Signature gold (#D4AF37) and black theme throughout.

## Tech Stack
- Frontend: React + TypeScript (Vite), Mapbox GL JS v3.20.0, Tailwind CSS
- Backend: Node.js + Express (server.ts on port 8001)
- Auth: Firebase (Anonymous + Email)
- Storage: Firestore + LocalStorage fallback
- APIs: Mapbox (Satellite map rendering), HERE Maps (Routing v8, Discover, Traffic — backend only), Google Gemini (TTS)

## Completed Features
- Core navigation with HERE truck routing v8 (backend proxy)
- **Mapbox GL JS map rendering** (satellite-streets-v12 with gold/dark CSS filter) — MIGRATED FROM HERE Maps
- MUTCD-compliant SVG road signs (Interstate shields, US Routes, Speed Limits, Truck Warnings)
- Professional NavigationHUD + bottom trip bar (Apple Maps style) — gold/black theme
- Real-time traffic incident overlays + auto-reroute
- Route Comparison Panel with smart tags (Fastest, Cheapest, 3 alternatives)
- Waypoint system (DEADHEAD/PAID stops)
- POI system with 40+ branded truck stop icons
- Weather overlay with 3-day forecast
- Driver/Truck profiles with license plates, trailers
- HUD Layout customization (Display tab)
- Collapsible map controls
- Lane guidance visualization with gold theme
- Compass rose + smooth tilt compensation
- Voice announcements (TTS) with imperial units (natural language)
- Guest login with localStorage persistence
- User Location Icon: Gold-filled circle with black directional arrow, thick black ring border, warm gold radiating glow pulse
- Traffic Light Throttling: ~0.3 miles minimum gap between markers
- Imperial Units: meters/km → miles/feet/quarter mile/half a mile throughout voice + HUD
- NavigationHUD: Pure black bg, gold arrows, gold text, gold borders
- Speed Limit Sign: Visible immediately on route start
- Map Rotation: Smooth compass tilt compensation (gamma/beta correction)

## Recently Completed (Feb 2026)
- **Mapbox GL JS Migration**: Complete migration from HERE Maps to Mapbox GL JS for map rendering
  - hereMapUtils.ts rewritten as Mapbox compatibility wrapper
  - NavigationView.tsx cleared of all H. namespace calls
  - Added addEventListener/removeEventListener, geoToScreen, setZIndex to wrapper
  - H.geo.Rect replaced with boundsFromCoords
  - All 12 test features verified passing (iteration_95.json)
- **POI Marker Clickability Fix**: Made POI markers interactive on the Mapbox map
  - Cluster provider markers now have pointerEvents: auto and cursor: pointer
  - Added .poi-cluster-marker class with data-poi-name/lat/lon attributes
  - Click handler in NavigationView.tsx detects clicks and opens POI detail modal via setSelectedPoi
- **Heading Up + Follow Me Fix**: Fixed map panning in wrong direction
  - Replaced CSS container rotation with Mapbox native setBearing()
  - User drag/pan now works correctly in all orientation modes (heading-up, north-up, compass)
  - Vehicle arrow now correctly shows 0deg in heading-up (points up) and heading-deg in north-up
  - Panning offset simplified: uses screen-space Y-offset since Mapbox handles bearing internally
- **Traffic Signs Deduplication**: Reduced clutter from repeated traffic lights and stop signs
  - Intersection clustering: only ONE of each type per 100m radius
  - Strict caps: max 2 traffic lights + 2 stop signs displayed on map at once
  - Stop sign throttling during route parsing (was missing, only traffic lights were throttled)
  - Hard cap of 6 total infrastructure markers
- **Profile Save Fix**: Fixed truck profile, driver profile, and edit truck profile not saving
  - Root cause: For non-anonymous users, updateProfile only wrote to Firestore (which fails on permission deny), silently dropping saves
  - Fix: Always update React state + localStorage immediately as primary store, Firestore as secondary sync
  - Profile load also now checks localStorage before falling back to defaults (was initializing with zeros)
  - Default truck dimensions changed from 0 to FHWA recommended (13.5ft, 78500 lbs, etc.)
  - Verified: Data persists across view navigation (Settings → Dashboard → Settings)

## Upcoming Tasks
- P1: Refactor NavigationView.tsx (~7100 lines) into smaller hooks/components
- P1: Speed limit warning system (red flash + audio alert)

## Future/Backlog
- P2: Viewport-based sign culling
- P2: Driver reputation/review system
- P2: Apple Sign-In Integration
- P2: PC*MILER Data integration
- P2: Route Safety Score badge

## Known Issues
- Gemini TTS API key flagged (403) — falls back to native TTS
- Nominatim reverse geocoding CORS errors in preview
- Intermittent service drops (trucker-nav/frontend) requiring supervisor restart
