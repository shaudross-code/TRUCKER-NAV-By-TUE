# TRUCKERS NAV By TUE — Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts, custom fuel network POI tracking, smooth GPS interpolation, and highway road shields/emblems on route overlays.

## Architecture
- **Stack**: React (Vite) + Express.js backend (single-process on port 8001)
- **Mapping**: Leaflet (2D heading-up) + Mapbox GL JS (3D satellite), Mapbox satellite-streets-v12 tiles
- **APIs**: HERE Maps Routing v8 (latest v8.140.0), HERE Discover, HERE Road Shields, HERE Traffic Incidents v7, Google Maps Places, Mapbox tiles, Gemini AI+TTS, Firebase Auth/Firestore
- **Preview URL**: https://hud-customizer-5.preview.emergentagent.com

## Completed Features (Cumulative)
### Core Navigation
- Turn-by-turn truck routing, 2D heading-up + 3D satellite view
- Smooth GPS interpolation, Speed display, POI stop insertion
- Lane Guidance Overlay, Route Snapping, Auto-Zoom for Maneuvers
- Route Comparison Panel, Toll Data Integration
- Voice Guidance: Graduated Maneuver Announcements
- Navigation Intelligence Overhaul (visual separation, ManeuverPreview, truck intelligence)

### MUTCD Road Signs System
- Interstate Shields (M1-1), US Route Shields (M1-4), State Route Shields
- Speed Limit Signs (R2-1), Warning Diamonds (W-series), CMV Warning Signs
- Regulatory Signs (R-series), Exit Guide Signs (E-series), Construction Warning
- All signs generated via `/app/utils/mutcdSigns.ts`

### HERE API v8.140.0 Upgrade
- Added vehicle[emptyWeight], vehicle[currentWeight], vehicle[tiresCount]

### Navigation UI
- Collapsible Map Controls, Decluttered user location icon
- Numbered waypoint markers, UI overlap fix, NavigationHUD mobile fix
- Real-time traffic incident overlays + auto-reroute countdown

### Display Layout / HUD Customization
- **Display tab** in sidebar between Fuel Network and Settings
- **18 toggleable HUD elements** across 3 categories: Navigation (5), Panels (5), Signs (8)
- **Show All / Hide All / Reset** buttons for quick configuration
- **Trip Panel Position** toggle (LEFT/RIGHT)
- **Drag-and-drop list reordering** within each category using @dnd-kit (core v6.3.1, sortable v10.0.0)
- **Live Preview** — Miniature 16:9 navigation view showing all HUD elements in their actual positions
- **Draggable Preview Positioning** — Edit mode with Lock/Unlock toggle, users drag HUD elements freely within the preview to reposition them on the navigation screen
  - 8 draggable elements: navigationHUD, speedOverlay, maneuverPreview, weatherPanel, tripPanel, mapControls, routeComparison, arrivalHUD
  - Gold move indicators on each element in edit mode
  - "Reset Pos" button to restore default positions
  - Positions persisted to localStorage (`nav_hud_positions`)
  - Positions applied to actual NavigationView via `hud-positions-changed` custom event
- **Order persistence** to localStorage (`nav_hud_order` key)

### EAS Build / CI
- EAS project linked (ID: ebee86f6-6e68-4248-9f23-0643d975ee4b)
- GitHub Actions workflow for iOS & Android builds (`.github/workflows/eas-build.yml`)
- macOS runner with Node 24, no Node 20 dependencies

### Other Features
- POI System, Fuel Network tab, Fuel Cost Calculator
- Driver Fatigue Alert (FMCSA HOS), Dynamic Lane Count Visualization
- Data Saver Toggle, Truck Profile Edit, Waypoint Arrived/Skip

## Upcoming Tasks (P1)
- Map filtering for Reputation Scores (4-star+ facilities)

## Future/Backlog (P2)
- Speed limit warning system (flash red + audio alert)
- Driver reputation/review system (truckers rate facilities)
- Viewport-based sign culling (DOM performance)
- iOS/Android Store Submission
- Refactoring NavigationView.tsx (~6700 lines)

## Key Technical Notes
- MUTCD signs: `/app/utils/mutcdSigns.ts`
- HERE API: v8 (latest v8.140.0)
- DnD libraries: @dnd-kit/core + @dnd-kit/sortable (list reorder), native pointer events (preview drag)
- HUD positions: stored in localStorage `nav_hud_positions`, applied via custom events
- Nginx proxies port 3000 -> 8001 (recreate if dropped)
- Services may drop ports intermittently — restart with `sudo supervisorctl restart trucker-nav`
