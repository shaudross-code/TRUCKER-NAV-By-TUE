# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

## Architecture
- **Stack**: React (Vite) + Express.js backend (single-process on port 8001)
- **Mapping**: Leaflet (2D heading-up) + Mapbox GL JS (3D satellite), Mapbox satellite-streets-v12 tiles
- **APIs**: HERE Maps (Routing, Discover, Road Shields), Google Maps (Places), Mapbox (tiles), Gemini (AI), Firebase (Auth/Firestore)
- **Key Pattern**: 150% oversized map container with CSS `rotate:` for heading-up mode without blank tiles
- **Preview URL**: https://nav-emblem-display.preview.emergentagent.com

## Completed Features
- Real POI integration (HERE Discover + Google Places)
- Turn-by-turn truck routing with HERE API
- 2D heading-up map rotation (oversized container hack)
- 3D satellite view with Mapbox GL JS
- Smooth GPS marker interpolation (requestAnimationFrame lerping)
- Speed display & instruction units (imperial conversion)
- POI stop position insertion
- Fuel Network tab (voice alerts for distance to selected POIs)
- Loading screen masking component render gaps
- Satellite tiles for 2D view (Mapbox satellite-streets-v12)
- **Highway Road Shield Emblems on Route Overlay** (2025-03-30)
  - Backend: `/api/road-shield` proxy with in-memory caching to HERE Map Image API v3
  - Frontend: Extracts `routeNumbers` from HERE routing spans, places official shield PNGs as Leaflet DivIcon markers along route
  - Supports Interstate (I-XX), US Highway (US-XX), and State Route shields
  - SVG fallback if HERE API fails
  - Shield markers cleared on route clear/cancel

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

## Future/Backlog (P2)
- Route comparison view (alternate routes with toll costs/fuel estimates)
- Fuel cost calculator (live diesel prices)
- Driver fatigue alert (DOT Hours of Service)
- iOS/Android Store Submission (requires user signing certs via /app/SIGNING_GUIDE.md)
- **Refactoring**: Break down NavigationView.tsx (~5000 lines) into hooks and sub-components

## Key Technical Notes
- DO NOT TOUCH map container scaling/clipping logic
- User icon: black circle with gold border + ping animation (DO NOT CHANGE)
- Nginx proxy on port 3000 sometimes drops — recreate if needed
