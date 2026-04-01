# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

## Architecture
- **Stack**: React (Vite) + Express.js backend (single-process on port 8001)
- **Mapping**: Leaflet (2D heading-up) + Mapbox GL JS (3D satellite), Mapbox satellite-streets-v12 tiles
- **APIs**: HERE Maps Routing v8 (latest v8.140.0), HERE Discover, HERE Road Shields, HERE Traffic Incidents v7, Google Maps Places, Mapbox tiles, Gemini AI+TTS, Firebase Auth/Firestore
- **Preview URL**: https://cmv-routing-dev.preview.emergentagent.com

## Completed Features (Cumulative)
### Core Navigation
- Turn-by-turn truck routing, 2D heading-up + 3D satellite view
- Smooth GPS interpolation, Speed display, POI stop insertion
- Lane Guidance Overlay, Route Snapping, Auto-Zoom for Maneuvers
- Route Comparison Panel, Toll Data Integration
- Voice Guidance: Graduated Maneuver Announcements
- Navigation Intelligence Overhaul (visual separation, ManeuverPreview, truck intelligence)

### MUTCD Road Signs System (2026-04-01)
- **Interstate Shields (M1-1)**: Blue shield with red "INTERSTATE" top band, white route number
- **US Route Shields (M1-4)**: Black/white shield with proper FHWA proportions
- **State Route Shields**: Circle style with black border
- **Speed Limit Signs (R2-1)**: White rectangle, "SPEED LIMIT" text, proper typography
- **Warning Diamonds (W-series)**: Yellow diamond with black border, standard symbols
  - Curve warnings (W1-1/W1-2)
  - Steep grade (W7-1) with truck-on-slope icon + grade percentage
  - Winding road (W1-5)
  - Low clearance (W12-2)
- **CMV Warning Signs**: Rollover risk (red border), steep downgrade/hill
- **Regulatory Signs (R-series)**: No Trucks (R5-2) with red slash, Weight Limit, No Hazmat
- **Exit Guide Signs (E-series)**: Green MUTCD rectangular with EXIT badge
- **Construction Warning**: Orange diamond (W20-1)
- All signs generated via `/app/utils/mutcdSigns.ts` utility module

### HERE API v8.140.0 Upgrade (2026-04-01)
- Added `vehicle[emptyWeight]` (35% of gross weight estimate)
- Added `vehicle[currentWeight]` (same as grossWeight for loaded truck)
- Added `vehicle[tiresCount]` (18 for 5-axle, calculated from axle count)
- Retained all existing params: height, grossWeight, length, width, axleCount, weightPerAxle, trailerCount

### Navigation UI (2026-04-01)
- Collapsible Map Controls with hamburger toggle, auto-collapse during driving
- Decluttered user location icon (clean blue chevron)
- Numbered waypoint markers (gold circles 1, 2, 3...)
- UI overlap fix: trip-info panel at bottom-[180px]
- NavigationHUD mobile fix (top-14 for browser toolbar clearance)
- Real-time traffic incident overlays + auto-reroute countdown

### Other Features
- POI System (truck stop plazas only), Fuel Network tab, Fuel Cost Calculator
- Driver Fatigue Alert (FMCSA HOS), Dynamic Lane Count Visualization
- Data Saver Toggle, Truck Profile Edit, Waypoint Arrived/Skip

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (4-star+ facilities)

## Future/Backlog (P2)
- Speed limit warning system (flash red + audio alert)
- Viewport-based sign culling (DOM performance)
- iOS/Android Store Submission
- Refactoring NavigationView.tsx (~6700 lines)

## Key Technical Notes
- MUTCD signs: `/app/utils/mutcdSigns.ts` — all sign generators with FHWA standard colors
- HERE API: v8 (latest v8.140.0) — `return=summary,actions,instructions,incidents,polyline,turnByTurnActions,elevation,tolls`
- MapControls auto-collapse via `isDrivingMode` prop
- Nginx proxy port 3000→8001 (recreate if dropped)
- Services may drop ports intermittently — restart with `sudo supervisorctl restart trucker-nav`
