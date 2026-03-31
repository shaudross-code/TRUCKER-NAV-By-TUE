# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

## Architecture
- **Stack**: React (Vite) + Express.js backend (single-process on port 8001)
- **Mapping**: Leaflet (2D heading-up) + Mapbox GL JS (3D satellite), Mapbox satellite-streets-v12 tiles
- **APIs**: HERE Maps (Routing w/ elevation, Discover, Road Shields), Google Maps (Places), Mapbox (tiles), Gemini (AI), Firebase (Auth/Firestore)
- **Key Pattern**: 150% oversized map container with CSS `rotate:` for heading-up mode without blank tiles
- **Counter-Rotate**: All map markers use `.counter-rotate` CSS class to stay upright during heading-up rotation
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
- **Highway Road Shield Emblems** — HERE Map Image API v3 for official shield PNGs with N/S/E/W direction badges
- **Highway Exit Signs** — Green exit signs at highway exits with exit number and destination
- **Sharp Curve Warning Signs** — Yellow diamond signs at sharp turns
- **Speed Limit Change Signs** — White signs at speed limit transition points
- **Traffic Slowdown Markers** — Red/orange markers at traffic incident locations
- **CMV Essential Warning Signs** (2025-03-31):
  - **Steep Downgrade** — Detects sustained negative grade > 5% from 3D elevation data (400m sliding window)
  - **Steep Hill** — Detects sustained positive grade > 6% for climbing sections
  - **Rollover Risk** — Detects sharp curves coinciding with > 3% grade
  - **Winding Road** — Detects frequent bearing changes (> 30° per ~200m) in route segments
  - All signs use yellow diamond format with truck SVG icons, severity-based borders
- **Counter-Rotation for All Map Signs** — All road signs, shields, traffic/restriction/weather markers stay upright during map rotation

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

## Future/Backlog (P2)
- Route comparison view (alternate routes with toll costs/fuel estimates)
- Fuel cost calculator (live diesel prices)
- Driver fatigue alert (DOT Hours of Service)
- iOS/Android Store Submission (requires user signing certs via /app/SIGNING_GUIDE.md)
- **Refactoring**: Break down NavigationView.tsx (~5500 lines) into hooks and sub-components

## Key Technical Notes
- DO NOT TOUCH map container scaling/clipping logic
- User icon: black circle with gold border + ping animation (DO NOT CHANGE)
- Nginx proxy on port 3000 sometimes drops — recreate if needed
- All sign markers stored in `shieldLayerGroupRef` and cleared via `clearLayers()` on route clear AND cancel
- CMV warnings computed from 3D polyline elevation data (HERE `return=elevation`)
