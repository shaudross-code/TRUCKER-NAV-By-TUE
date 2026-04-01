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
- 2D heading-up map rotation + 3D satellite view
- Smooth GPS marker interpolation, Speed display, POI stop insertion
- Fuel Network tab, Loading screen, Satellite tiles
- Highway Road Shield Emblems, Exit Signs, Curve Warning Signs, Speed Limit Signs
- Traffic Slowdown Markers, CMV Essential Warning Signs, CMV Voice Announcements
- Counter-Rotation for All Map Signs, Heading-Up Precision Fix
- Sidebar Overflow Fix, Data Saver Toggle, Truck Profile Edit Modal
- Waypoint Arrived/Skip Panel, Route Overlay Z-Ordering
- Multi-Section Route Merging, Route Fetch Retry, Network & GPS Monitoring
- Lane Guidance Overlay, Route Snapping, Auto-Zoom for Maneuvers
- Route Comparison Panel, Toll Data Integration
- Fuel Cost Calculator, Driver Fatigue Alert (FMCSA HOS)
- Dynamic Lane Count Visualization
- POI System Overhaul: Truck Stop Plazas Only
- Voice Guidance: Graduated Maneuver Announcements
- Navigation Intelligence Overhaul

### New Features (2026-04-01)
- **Decluttered User Location Icon**: Simplified blue chevron, 40x40px.
- **Collapsible Map Controls**: Hamburger (☰) toggle, auto-collapses during driving. Original button order preserved.
- **Numbered Waypoint Markers**: Gold numbered circles (1, 2, 3...) at waypoints on map.
- **UI Overlap Fix**: Trip-info panel at `bottom-[180px]` right side, auto-collapse MapControls during driving.
- **Real-time Traffic Incident Overlays**: Color-coded markers from HERE Traffic API v7 on route.
- **Auto-Reroute Countdown**: 10s countdown for critical traffic incidents.
- **NavigationHUD Mobile Fix**: Pushed HUD down to `top-14` on mobile/tablet to prevent browser toolbar clipping. Desktop stays at `top-3` via `lg:` breakpoint.

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (e.g., "only show 4-star+ facilities")

## Future/Backlog (P2)
- Speed limit warning system
- Viewport-based sign culling
- iOS/Android Store Submission
- Refactoring NavigationView.tsx (~6700 lines)

## Key Technical Notes
- Nginx proxy on port 3000 → 8001 (must recreate if dropped)
- HERE API `return` valid: summary, actions, instructions, incidents, polyline, turnByTurnActions, elevation, tolls
- MapControls auto-collapse via `isDrivingMode` prop
- Traffic incidents from `/api/traffic-incidents`
- NavigationHUD positioning: `top-14` mobile/tablet, `lg:top-3` desktop (accounts for browser toolbar)
- The "backend" supervisor process must be stopped to avoid port conflict with trucker-nav
