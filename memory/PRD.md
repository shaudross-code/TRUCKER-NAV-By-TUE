# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

## Architecture
- **Stack**: React (Vite) + Express.js backend (single-process on port 8001)
- **Mapping**: Leaflet (2D heading-up) + Mapbox GL JS (3D satellite), Mapbox satellite-streets-v12 tiles
- **APIs**: HERE Maps (Routing w/ elevation, Discover, Road Shields, Traffic Incidents), Google Maps (Places), Mapbox (tiles), Gemini (AI + TTS), Firebase (Auth/Firestore)
- **Key Pattern**: 150% oversized map container with CSS `rotate:` for heading-up mode without blank tiles
- **Counter-Rotate**: All map markers use `.counter-rotate` CSS class to stay upright during heading-up rotation
- **Preview URL**: https://cmv-routing-dev.preview.emergentagent.com

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
- Truck Profile Edit Modal
- Waypoint Arrived/Skip Panel
- User Icon Spin/Direction Fix
- Route Overlay Z-Ordering (custom Leaflet panes)
- Multi-Section Route Merging
- Route Fetch Retry (exponential backoff)
- Network & GPS Monitoring
- Centralized Sign Clearing
- Lane Guidance Overlay
- HERE-Style Navigation Chevron
- Route Snapping
- Auto-Zoom for Maneuvers
- Zoom Level Indicator
- Highway Shield Clustering Fix
- Shield Image Blob Cache
- CSS Performance Optimizations
- Nginx Proxy Setup
- Route Comparison Panel
- Toll Data Integration
- Fuel Cost Calculator
- Driver Fatigue Alert (FMCSA HOS)
- Dynamic Lane Count Visualization
- Bug Fix: Pay Summary Inputs
- Bug Fix: Dashboard Card Inputs Not Saving for Guests
- Bug Fix: NaN Guards
- POI System Overhaul: Truck Stop Plazas Only
- Voice Guidance: Graduated Maneuver Announcements
- Navigation Intelligence Overhaul (route visual separation, active segment highlighting, ManeuverPreview, truck intelligence)

### New Features (2026-04-01)
- **Decluttered User Location Icon**: Simplified navigation chevron — removed pulsing circles, reduced SVG complexity, smaller icon (40x40 from 60x60). Clean blue gradient chevron only.
- **Collapsible Map Controls**: Added hamburger (☰) toggle button at top of MapControls. Secondary controls (filter, overview, 2D/3D, follow user, compass) collapse on toggle. Zoom in/out, zoom level indicator, and heading-up/north-up remain always visible.
- **Numbered Waypoint Markers**: Gold numbered circles (1, 2, 3...) appear on the map at each waypoint location during active navigation. Counter-rotated to stay upright in heading-up mode. Cleared on route cancel.
- **UI Overlap Fix (Fuel Cost & HOS)**: Moved trip-info panel from `top-[55%]` to `bottom-[7rem]` positioning, preventing overlap with MapControls on the right side.
- **Real-time Traffic Incident Overlays**: Fetches live incidents from HERE Traffic API (`/api/traffic-incidents`) every 60s during active navigation. Color-coded markers (red=accident, dark red=closure, yellow=construction, orange=congestion) on the route. Popup details on click.
- **Auto-Reroute Countdown**: When critical traffic incidents are detected on the active route, a 10-second countdown banner appears. After countdown, automatically re-calculates route. Cancel button available.

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

## Future/Backlog (P2)
- Speed limit warning system (flash red + audio alert when exceeding posted speed)
- Viewport-based sign culling (performance optimization — only render visible signs)
- iOS/Android Store Submission (requires user signing certs via /app/SIGNING_GUIDE.md)
- Refactoring: Break down NavigationView.tsx (~6700 lines) into hooks and sub-components

## Key Technical Notes
- DO NOT TOUCH map container scaling/clipping logic
- User icon: Clean blue navigation chevron (SVG with gradient #4285F4→#1A73E8, 40x40px)
- Nginx proxy on port 3000 → port 8001 (must recreate if dropped: /etc/nginx/sites-enabled/default)
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
- Traffic incidents fetched from `/api/traffic-incidents` (HERE Traffic API v7)
- Waypoint markers stored in `waypointMarkersRef`, traffic incidents in `trafficIncidentMarkersRef`
- MapControls collapse state managed via `isCollapsed` local state in component
