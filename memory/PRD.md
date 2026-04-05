# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation application with:
- Real POIs using HERE Maps API
- Turn-by-turn navigation with voice guidance
- Real-time traffic/infrastructure alerts
- 3D/2D satellite maps with dynamic switching
- MUTCD-compliant official US road signs
- Customizable UI/HUD layouts
- Custom fuel network POI tracking
- CMV warning systems
- Multi-user support with Google Sign-In
- Timed guest sessions (2 hours)
- Gold/black themed navigation interface
- Professional highway overlays with comprehensive exit signs
- Permanent hardcoded highway/road overlay on the map
- Inline road name labels along route polyline

## Architecture
- **Frontend**: React + Vite + TypeScript + Leaflet
- **Backend**: Node.js + Express (port 8001)
- **Frontend Proxy**: Nginx (port 3000)
- **Auth**: Firebase Auth (Google via custom token flow, Email/Password, Anonymous/Guest)
- **Database**: Firebase Firestore + localStorage (user-scoped)
- **Maps**: HERE Maps API (routing v8), Mapbox (tiles + road overlay), Google Maps (Places API)

## Preview URL
https://hud-customizer-5.preview.emergentagent.com

## Completed Features
- [x] Core navigation with HERE API truck routing (v8.140.0)
- [x] MUTCD-compliant vector road signs (Interstate shields, US Routes, Speed Limits, Warnings)
- [x] Real-time traffic incident overlays with auto-reroute countdown
- [x] Collapsible map controls with hamburger button
- [x] Waypoint numbered markers on route
- [x] Customizable HUD Layout editor (Display tab in sidebar)
- [x] Voice announcements and lane guidance
- [x] POI marker clustering (leaflet.markercluster)
- [x] Coming Soon overlays (Load Board, Truck Stops)
- [x] Multi-user localStorage scoping (userStorage.ts)
- [x] Tutorial overlay for new users
- [x] Weigh Stations / Certified Scales POIs
- [x] 2-hour Guest Session Timer with countdown warnings
- [x] Google Sign-In (full-page redirect + Firebase custom token)
- [x] Clean slate truck profile for new users
- [x] Clean slate pay summary (no fake statements)
- [x] Coming Soon overlay on Maintenance, Offline Maps tabs
- [x] Announcements section (iOS/Android development notice)
- [x] Denser highway shield placement along routes
- [x] Enhanced exit sign extraction from all action types
- [x] Larger, more professional exit guide sign visuals
- [x] Permanent highway/road network overlay (Mapbox navigation-night-v1, mix-blend-mode:screen) - Apr 2026
- [x] Pure satellite base tiles (satellite-v9) for cleaner overlay effect - Apr 2026
- [x] Inline road name labels along route polyline with mini highway emblems - Apr 2026
- [x] Labels oriented to road bearing, rotate with user heading - Apr 2026

## Google Sign-In Implementation Details
- Uses full-page redirect flow (no popups - avoids Safari COOP issues)
- Server exchanges Google auth code for tokens, then creates Firebase custom token via Admin SDK
- Frontend uses signInWithCustomToken to complete sign-in

## Road Overlay Architecture
- **Base tiles**: Mapbox `satellite-v9` (pure satellite, no built-in streets)
- **Road overlay**: 2x Mapbox `navigation-night-v1` layers on `roadOverlayPane` (z-index 350)
- **Blend mode**: `mix-blend-mode: screen` makes dark background invisible, keeps bright roads
- **Road labels**: `placeRoadLabels()` in `useSignPlacement.ts` places labels every ~80 polyline points
- **Label orientation**: Each label rotated to match road bearing at that point
- **No counter-rotate**: Labels rotate WITH map heading during navigation

## Upcoming Tasks (Priority Order)
1. **P1**: Refactor NavigationView.tsx (~7000 lines) into smaller hooks/components
2. **P2**: Apple Sign-In integration (requires Apple Developer credentials)
3. **P2**: Speed limit warning system

## Future/Backlog
- PC*MILER Data integration (requires enterprise API)
- Route Safety Score badge
- Viewport-based sign culling (performance)
- Driver reputation/review system
- iOS and Android Store Submission

## Key Files
- `/app/components/NavigationView.tsx` - Core map UI (~7000+ lines, needs refactoring)
- `/app/components/FirebaseProvider.tsx` - Auth context + Google OAuth
- `/app/components/HudLayoutView.tsx` - HUD customization
- `/app/components/GuestSessionTimer.tsx` - 2hr guest timer
- `/app/hooks/useSignPlacement.ts` - Sign placement, road labels, and rendering
- `/app/utils/mutcdSigns.ts` - MUTCD road sign SVG generation
- `/app/server.ts` - Express backend (HERE API, Google OAuth)
- `/app/utils/userStorage.ts` - User-scoped localStorage

## Known Issues
- NavigationView.tsx is dangerously large (~7000+ lines) - needs refactoring
- Apple Sign-In disabled (requires Apple Developer credentials)
- Some state road shield API requests fail intermittently (non-blocking, SVG fallback used)
