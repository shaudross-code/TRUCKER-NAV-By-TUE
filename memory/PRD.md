# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

## Architecture
- **Stack**: React (Vite) + Express.js backend (single-process on port 8001)
- **Mapping**: Leaflet (2D heading-up) + Mapbox GL JS (3D satellite), Mapbox satellite-streets-v12 tiles
- **APIs**: HERE Maps (Routing w/ elevation, Discover, Road Shields), Google Maps (Places), Mapbox (tiles), Gemini (AI + TTS), Firebase (Auth/Firestore)
- **Key Pattern**: 150% oversized map container with CSS `rotate:` for heading-up mode without blank tiles
- **Counter-Rotate**: All map markers use `.counter-rotate` CSS class to stay upright during heading-up rotation
- **Preview URL**: https://nav-gps-route.preview.emergentagent.com

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

- **P0 Backend Fix: HERE API 400 Error** (2026-03-31): Removed invalid `notices` from HERE API `return` parameter in server.ts line 263. `notices` is only valid for `spans`, not `return`. Route calculation restored — 3 alternatives, full span data (speedLimit, truckAttributes, notices).
- **Nginx Proxy Setup** (2026-03-31): Configured nginx on port 3000 to reverse-proxy to port 8001 (Express+Vite). Previous sessions had this drop occasionally.
- **Route Comparison Panel** (2026-03-31): Replaced inline route preview with dedicated `RouteComparisonPanel` component. Shows toll costs, fuel estimates (gallons + cost), duration, distance, and restriction count for each route alternative. Professional card-based layout with color-coded route indicators.
- **Toll Data Integration** (2026-03-31): Added `tolls` to HERE API `return` parameter in server.ts. Toll costs extracted from route sections and displayed in route comparison. NYC congestion pricing verified.
- **Fuel Cost Calculator** (2026-03-31): New `FuelCostCalculator` component with adjustable diesel price ($2-$6/gal slider) and truck MPG (3-10 slider). Shows total cost, gallons needed, cost per mile. Defaults to national average $3.52/gal and 6.5 MPG. Collapsible panel on right side during navigation.
- **Driver Fatigue Alert (FMCSA HOS)** (2026-03-31): New `DriverFatigueAlert` component tracking all standard FMCSA Hours of Service rules: 11-hour driving limit, 14-hour on-duty window, 30-minute break after 8 hours, 70-hour/8-day cycle. Color-coded progress bars (green→amber→red), voice alerts for violations, Start Break / 10hr Off-Duty / Reset Cycle actions. State persisted to localStorage.
- **Dynamic Lane Count Visualization** (2026-03-31): New `useLaneVisualization` hook draws white dashed lane divider lines on highway segments. Lane count inferred from HERE API `functionalClass` spans (FC1→4 lanes, FC2→3, FC3-4→2, FC5→1). Lane count indicators ("4L", "3L") shown at segment midpoints. Only rendered on FC1/FC2 highways to avoid clutter.
- **Bug Fix: Pay Summary Inputs** (2026-03-31): Replaced direct-bind controlled inputs with `EditableNumberInput` component using local-state + blur-save pattern. Fixes "snap back to 0" issue when clearing fields.
- **Bug Fix: Dashboard Card Inputs Not Saving for Guests** (2026-03-31): Anonymous users now skip Firestore writes entirely (saves locally via localStorage). Eliminates REQUEST_FAILED console errors.
- **Bug Fix: NaN Guards** (2026-03-31): All financial setters in App.tsx reject NaN values to prevent data corruption.
- **POI System Overhaul: Truck Stop Plazas Only** (2026-03-31): Removed all regular gas station brands (Shell, BP, Exxon, Speedway, Casey's, Wawa, Sheetz, QuikTrip, RaceTrac, Circle K, 7-Eleven, Conoco, Marathon, etc.) from POI system. Only shows actual truck stop plazas: Love's, Pilot, Flying J, Petro, TA, Road Ranger, Buc-ee's, Sapp Bros, Ambest. EV stations completely removed. Added DOT Weigh Station and Certified Scale specific searches. Updated filter panel, Fuel Network page, and PoiIcon components.

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

## Future/Backlog (P2)
- Speed limit warning system (flash red + audio alert when exceeding posted speed)
- Viewport-based sign culling (performance optimization — only render visible signs)
- iOS/Android Store Submission (requires user signing certs via /app/SIGNING_GUIDE.md)
- Refactoring: Break down NavigationView.tsx (~6200 lines) into hooks and sub-components

## Key Technical Notes
- DO NOT TOUCH map container scaling/clipping logic
- User icon: HERE-style blue navigation chevron (SVG with gradient #4285F4→#1A73E8)
- Nginx proxy on port 3000 → port 8001 (must recreate if dropped: /etc/nginx/conf.d/app-proxy.conf)
- All sign markers stored in `shieldLayerGroupRef` and cleared on route clear AND cancel
- CMV warnings computed from 3D polyline elevation data (HERE `return=elevation`)
- Heading-up rotation: `totalRotation = -currentHeading` (NO manualRotation)
- Touch rotation blocked in heading-up mode (only allowed in north-up mode)
- The "backend" supervisor process must be stopped to avoid port conflict with trucker-nav
- HERE API `return` valid types: summary, actions, instructions, incidents, polyline, turnByTurnActions, elevation, tolls (NOT notices)
- HERE API `spans` valid types include: notices, truckAttributes, speedLimit, maxSpeed, functionalClass, etc.
- Lane visualization uses `functionalClass` from spans: FC1=4 lanes, FC2=3, FC3-4=2, FC5=1
- Fuel cost default: $3.52/gal national average, 6.5 MPG
- FMCSA HOS rules: 11hr drive, 14hr on-duty, 30min break after 8hr, 70hr/8day cycle
