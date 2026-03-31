# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

## Architecture
- **Stack**: React (Vite) + Express.js backend (single-process on port 8001)
- **Mapping**: Leaflet (2D heading-up) + Mapbox GL JS (3D satellite), Mapbox satellite-streets-v12 tiles
- **APIs**: HERE Maps (Routing w/ elevation, Discover, Road Shields), Google Maps (Places), Mapbox (tiles), Gemini (AI + TTS), Firebase (Auth/Firestore)
- **Key Pattern**: 150% oversized map container with CSS `rotate:` for heading-up mode without blank tiles
- **Counter-Rotate**: All map markers use `.counter-rotate` CSS class to stay upright during heading-up rotation
- **Preview URL**: https://navigation-staging.preview.emergentagent.com

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
- Highway Road Shield Emblems — HERE Map Image API v3 with N/S/E/W direction badges
- Highway Exit Signs — Green exit signs at highway exits
- Sharp Curve Warning Signs — Yellow diamond signs at sharp turns
- Speed Limit Change Signs — White signs at transition points
- Traffic Slowdown Markers — Red/orange markers at incident locations
- CMV Essential Warning Signs — Steep Downgrade, Steep Hill, Rollover Risk, Winding Road
- CMV Voice Announcements — Proximity-based TTS at 2mi and 0.5mi from hazard zones
- Counter-Rotation for All Map Signs — All signs stay upright during heading-up rotation
- Heading-Up Precision Fix — Removed manualRotation offset, blocked touch rotation in heading-up
- Sidebar Overflow Fix — All 9 nav items visible (reduced padding, compact bottom actions)
- Data Saver Toggle — Functional toggle in Settings (OSM tiles + SVG shields when ON)
- **Truck Profile Edit Modal** (2026-03-31): Replaced `window.prompt()` with React modal for editing truck fields (height, weight, length, width, axle count, axle weight, trailer count, tunnel category, hazmat classes). Number input for numeric fields, dropdown select for tunnel category.
- **Waypoint Arrived/Skip Panel** (2026-03-31): Added interactive popup above bottom HUD during active navigation. Shows next waypoint with Arrived (removes + reroutes) and Skip (removes + reroutes) buttons. Voice announcement on action. Shows remaining stop count.
- **User Icon Spin/Direction Fix** (2026-03-31): Fixed marker being recreated on every GPS update (caused spinning). Added guard clause to create marker only once. Removed CSS transition desync between vehicle-pointer and map-container. Pre-applies smoothed heading on creation to prevent 0° flash.
- **Route Overlay Z-Ordering** (2026-03-31): Created custom Leaflet panes — routePane (z-index 420) for polylines, signPane (z-index 630) for all sign markers. All 6 sign types (highway shields, exits, curves, speed limits, traffic, CMV warnings) render ON TOP of the highlighted route.
- **Multi-Section Route Merging** (2026-03-31): Waypoint routes with multiple sections now merge polylines and offset action/span indices correctly for proper exit placement across all legs.
- **Route Fetch Retry** (2026-03-31): Added exponential backoff retry (2 retries, 1s/2s delay) for route API calls. Handles network flakes gracefully.
- **Network & GPS Monitoring** (2026-03-31): Added offline banner ("No Network — Using Cached Data") and weak GPS signal indicator for professional reliability. Added isOnline and gpsAccuracy to AppContext.
- **Centralized Sign Clearing** (2026-03-31): Moved sign clearing to a single point before all sign placement, preventing stale sign accumulation.
- **Lane Guidance Overlay** (2026-03-31): Rewrote NavigationHUD with proper LaneData type (direction+matches object). Lane guidance panel appears within 2 miles of maneuver with road-style visualization — active lanes highlighted in blue (#4285F4), dashed lane separators, top indicator bars, lane numbering.
- **HERE-Style Navigation Chevron** (2026-03-31): Replaced gold circle+arrow user icon with professional blue gradient chevron (SVG with linearGradient #4285F4→#1A73E8, white stroke, glow filter). Matches HERE/Google Maps navigation aesthetic.
- **Route Snapping** (2026-03-31): User marker position is projected onto the nearest route polyline segment during active navigation. Uses orthogonal sub-segment interpolation for smooth placement between vertices. Snap threshold ~100m — falls back to raw GPS when off-route.
- **Auto-Zoom for Maneuvers** (2026-03-31): Zooms in +2 levels when within 0.3mi of a turn (0.4mi for complex maneuvers: exits, forks, roundabouts, merges). Smoothly zooms back to user's preferred level when past 0.6mi. Uses flyTo with easing. Resets on route clear/cancel.
- **Zoom Level Indicator** (2026-03-31): Shows current zoom level number between + and - buttons in MapControls. Updates reactively via Leaflet zoomend event. User's preferred zoom is tracked separately from auto-zoom changes.
- **Highway Shield Clustering Fix** (2026-03-31): Fixed over-clustering by using different spacing gaps: SAME_ROAD_GAP (~8% of route, ~40-60mi apart) for same road repeats, DIFF_ROAD_GAP (~0.5%) for route number changes. Shield count reduced from 27 to 14 for 545mi route.
- **Shield Image Blob Cache** (2026-03-31): Pre-fetches unique shield images in parallel via Promise.all, stores as blob:// URLs. Eliminates duplicate HTTP requests for same shield type. Falls back to SVG in data saver mode.
- **CSS Performance Optimizations** (2026-03-31): Added will-change: transform and contain: layout/style on highway-shield-icon, user-marker-container, leaflet-marker-pane, counter-rotate elements for GPU compositing.

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

## Future/Backlog (P2)
- Route comparison view (alternate routes with toll costs/fuel estimates)
- Fuel cost calculator (live diesel prices)
- Driver fatigue alert (DOT Hours of Service)
- iOS/Android Store Submission (requires user signing certs via /app/SIGNING_GUIDE.md)
- Refactoring: Break down NavigationView.tsx (~5600 lines) into hooks and sub-components

## Key Technical Notes
- DO NOT TOUCH map container scaling/clipping logic
- User icon: black circle with gold border + ping animation (DO NOT CHANGE)
- Nginx proxy on port 3000 sometimes drops — recreate if needed
- All sign markers stored in `shieldLayerGroupRef` and cleared on route clear AND cancel
- CMV warnings computed from 3D polyline elevation data (HERE `return=elevation`)
- Heading-up rotation: `totalRotation = -currentHeading` (NO manualRotation)
- Touch rotation blocked in heading-up mode (only allowed in north-up mode)
- The "backend" supervisor process must be stopped to avoid port conflict with trucker-nav
