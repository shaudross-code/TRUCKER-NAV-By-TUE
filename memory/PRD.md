# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

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
- Highway Road Shield Emblems, Exit Signs, Curve Warning Signs, Speed Limit Change Signs
- Traffic Slowdown Markers, CMV Essential Warning Signs, CMV Voice Announcements
- Counter-Rotation for All Map Signs
- Heading-Up Precision Fix, Sidebar Overflow Fix, Data Saver Toggle
- Truck Profile Edit Modal, Waypoint Arrived/Skip Panel
- Route Overlay Z-Ordering, Multi-Section Route Merging, Route Fetch Retry
- Network & GPS Monitoring, Lane Guidance Overlay, Route Snapping, Auto-Zoom for Maneuvers
- Route Comparison Panel, Toll Data Integration
- Fuel Cost Calculator, Driver Fatigue Alert (FMCSA HOS)
- Dynamic Lane Count Visualization
- POI System Overhaul: Truck Stop Plazas Only
- Voice Guidance: Graduated Maneuver Announcements
- Navigation Intelligence Overhaul (route visual separation, active segment highlighting, ManeuverPreview, truck intelligence)

### New Features (2026-04-01)
- **Decluttered User Location Icon**: Simplified navigation chevron — removed pulsing circles, smaller icon (40x40).
- **Collapsible Map Controls**: Hamburger (☰) toggle button. Auto-collapses during driving mode. Filter, Overview, 2D/3D, Follow, Compass are collapsible. Zoom +/-, zoom level, heading-up always visible. Original button order preserved.
- **Numbered Waypoint Markers**: Gold numbered circles (1, 2, 3...) on the map at each waypoint during active navigation.
- **UI Overlap Fix (Fuel Cost & HOS)**: Repositioned trip-info panel to `bottom-[180px]` right side, clearing both MapControls above and arrival HUD below. Auto-collapse of MapControls during driving prevents vertical overlap.
- **Real-time Traffic Incident Overlays**: Live incidents from HERE Traffic API v7 every 60s during navigation. Color-coded markers on route. Popup details on click.
- **Auto-Reroute Countdown**: 10s countdown banner for critical traffic incidents with cancel option.

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

## Future/Backlog (P2)
- Speed limit warning system (flash red + audio alert when exceeding posted speed)
- Viewport-based sign culling (performance optimization — only render visible signs)
- iOS/Android Store Submission
- Refactoring: Break down NavigationView.tsx (~6700 lines) into hooks and sub-components

## Key Technical Notes
- Nginx proxy on port 3000 → port 8001 (must recreate if dropped)
- All sign markers stored in `shieldLayerGroupRef`
- Heading-up rotation: `totalRotation = -currentHeading` (NO manualRotation)
- HERE API `return` valid types: summary, actions, instructions, incidents, polyline, turnByTurnActions, elevation, tolls
- Fuel cost default: $3.52/gal, 6.5 MPG; HOS rules: 11hr drive, 14hr on-duty, 30min break after 8hr, 70hr/8day
- MapControls auto-collapse via `isDrivingMode` prop; original button order: Filter→Zoom→Overview→2D→Follow→Heading→Compass
- Traffic incidents fetched from `/api/traffic-incidents` (HERE Traffic API v7)
- Waypoint markers in `waypointMarkersRef`, traffic incidents in `trafficIncidentMarkersRef`
