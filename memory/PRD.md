# TRUCKERS NAV By TUE - Product Requirements

## Core Vision
Professional trucking GPS navigation app with real POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, satellite maps, MUTCD-compliant road signs, and customizable UI/HUD layouts. Signature gold (#D4AF37) theme.

## Tech Stack
- Frontend: React + TypeScript (Vite), HERE Maps JS API v3, Leaflet, Tailwind CSS
- Backend: Node.js + Express (server.ts on port 8001)
- Auth: Firebase (Anonymous + Email)
- Storage: Firestore + LocalStorage fallback
- APIs: HERE Maps (Routing v8, Discover, Traffic), Mapbox (Raster Tiles), Google Gemini (TTS)

## Completed Features
- Core navigation with HERE truck routing v8
- MUTCD-compliant SVG road signs (Interstate shields, US Routes, Speed Limits, Truck Warnings)
- Professional NavigationHUD + bottom trip bar (Apple Maps style)
- Real-time traffic incident overlays + auto-reroute
- Route Comparison Panel with smart tags (Fastest, Cheapest)
- Waypoint system (DEADHEAD/PAID stops)
- POI system with 40+ branded truck stop icons
- Weather overlay with 3-day forecast
- Driver/Truck profiles with license plates, trailers
- HUD Layout customization (Display tab)
- Collapsible map controls
- Lane guidance visualization
- Compass rose
- Voice announcements (TTS)
- Guest login with localStorage persistence

## Recently Fixed (Feb 2026)
- P0 BUG: App crash on START NAV click - Two root causes:
  1. `useRef(0)` inside `useEffect` (invalid hook call) - Changed to closure variable
  2. `getPoiIcon()` JSX element destructured as object - Fixed to use JSX directly

## Upcoming Tasks
- P1: Refactor NavigationView.tsx (~7000 lines) into smaller hooks/components
- P1: Speed limit warning system (red flash + audio alert)

## Future/Backlog
- P2: Viewport-based sign culling
- P2: Driver reputation/review system
- P2: Apple Sign-In Integration
- P2: PC*MILER Data integration
- P2: Route Safety Score badge

## Known Issues
- Gemini TTS API key flagged as leaked (403) - falls back to native TTS
- Nominatim reverse geocoding CORS errors in preview
- Intermittent service drops (trucker-nav/frontend) requiring supervisor restart
