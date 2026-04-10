# TRUCKERS NAV By TUE - Product Requirements

## Core Vision
Professional trucking GPS navigation app with real POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, satellite maps, MUTCD-compliant road signs, and customizable UI/HUD layouts. Signature gold (#D4AF37) and black theme throughout.

## Tech Stack
- Frontend: React + TypeScript (Vite), HERE Maps JS API v3, Tailwind CSS
- Backend: Node.js + Express (server.ts on port 8001)
- Auth: Firebase (Anonymous + Email)
- Storage: Firestore + LocalStorage fallback
- APIs: HERE Maps (Routing v8, Discover, Traffic), Mapbox, Google Gemini (TTS)

## Completed Features
- Core navigation with HERE truck routing v8
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
- Compass rose
- Voice announcements (TTS with Gemini fallback to native)
- Guest login with localStorage persistence

## Recently Completed (Feb 2026)
- P0 BUG FIX: App crash on START NAV — two root causes fixed:
  1. `useRef(0)` inside `useEffect` → changed to closure variable
  2. `getPoiIcon()` JSX destructuring mismatch → use JSX directly
- Map Performance: Changed HERE tile ppi from 400→72 (fixes oversized restriction icons/text)
- User Location Icon: Gold (#D4AF37) arrow with black outline + pulsing green animation
- NavigationHUD Theme: Pure black background, gold direction arrows, gold instruction text, gold borders
- Speed Limit Sign: Now shows immediately on route calculation (initial span extraction)
- Map Rotation: Smooth compass tilt compensation via device orientation (gamma/beta correction)
- Lane Guidance: Updated to gold-accented theme

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
- Gemini TTS API key flagged (403) — falls back to native TTS
- Nominatim reverse geocoding CORS errors in preview
- Intermittent service drops (trucker-nav/frontend) requiring supervisor restart
- Tangram tile renderer intermittent errors (non-blocking, map still renders)
