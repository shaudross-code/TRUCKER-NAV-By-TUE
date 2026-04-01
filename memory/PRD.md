# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, and customizable UI/HUD layouts.

## Architecture
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Leaflet Maps
- **Backend**: Node.js/Express (server.ts) on port 8001
- **Mobile**: Capacitor (iOS/Android) with EAS Build CI/CD
- **APIs**: HERE Maps (Routing v8, Discover, Traffic), Mapbox (Tiles), Google Maps (Places), Firebase (Auth), Gemini AI
- **Storage**: Firebase Firestore + LocalStorage (guest config)

## What's Been Implemented (Completed)

### Core Navigation
- Custom truck routing via HERE API v8.140.0
- Turn-by-turn navigation with voice guidance
- Route comparison (up to 3 alternatives with time/distance/fuel cost)
- Lane guidance with dynamic lane visualization
- Maneuver previews with upcoming turn info
- GPS interpolation for smooth marker movement
- Route following with automatic route-snapping

### Map Features
- 2D satellite/street maps with Mapbox + Leaflet
- 3D mode via MapLibre GL
- Custom Leaflet panes (routePane, signPane)
- Collapsible map controls (zoom, tilt, compass)
- Numbered waypoint markers
- Highway shield markers (MUTCD-compliant)

### Safety & Alerts
- Real-time traffic incident overlays
- Auto-reroute countdown on off-route detection
- Truck restriction warnings (bridges, weight, tunnel, hazmat)
- CMV warning signs (steep grades, rollover risk)
- Speed limit display (MUTCD-style signs on map)
- Weather alerts and route hazard reports

### Professional Lane Guidance System
- **Visual LaneRibbon**: SVG directional arrows (8 directions) with blue highlighting for recommended lanes
- **Synthesized lane data**: Generated from HERE API action types
- **Voice lane guidance**: 7+ distance thresholds with professional callouts

### UI/HUD System
- NavigationHUD: Top-center turn-by-turn instruction card
- Arrival HUD: Bottom bar with road name, speed, distance, time, ETA
- Weather panel with forecast
- Fuel cost and HOS status panels
- Truck restrictions and route hazards panels
- Along-route POI list
- Compass Rose

### HUD Layout Customization (Display Tab)
- 20 toggleable HUD elements organized in Navigation/Panels/Signs categories
- Compass Rose toggle (show/hide compass indicator)
- Next Stop toggle (show/hide waypoint panel above arrival bar)
- Element resize system (XS=70%, S=85%, M=100%, L=115%, XL=130%) for 11 resizable elements
- Scale transforms applied to ALL resizable elements (navigationHUD, speedOverlay, arrivalHUD, maneuverPreview, compassRose, nextStop, fuelCost, hosStatus, mapControls, routeComparison, weatherPanel)
- Drag-and-drop repositioning via @dnd-kit
- Pixel-perfect NavPreview with Compass Rose + Next Stop mockups for live layout editing (In Route / Idle modes)
- Persistent config via LocalStorage
- Show All / Hide All / Reset buttons
- Trip Panel Position toggle (LEFT/RIGHT)

### Mobile Build Pipeline
- Capacitor integration for iOS/Android
- GitHub Actions workflow (eas-build.yml) for remote builds
- EAS Build profiles configured

## Bug Fixes Applied (Latest Session - Apr 1, 2026)
1. **NavPreview missing Compass Rose + Next Stop** - Added mockup elements with data-testids, tied idle-mode compass to showCompassRose toggle
2. **Missing scale transforms** - Applied hudScales for maneuverPreview, fuelCost, hosStatus, routeComparison, weatherPanel in NavigationView.tsx

## Known Issues
- **Intermittent service drops**: trucker-nav and frontend supervisor processes drop ports occasionally. Restart with `sudo supervisorctl restart trucker-nav` and `sudo supervisorctl restart frontend`.

## Upcoming Tasks
- **P1**: Map filtering for Reputation Scores (4-star+ facilities)
- **P2**: Speed limit warning system (flash red + audio alert when exceeding posted speed)
- **P2**: Driver reputation/review system (truckers rate facilities)

## Future/Backlog
- Viewport-based sign culling (DOM performance optimization)
- NavigationView.tsx refactoring (~6900 lines -> smaller hooks/components)
- iOS/Android Store Submission

## Key Files
- `/app/components/NavigationView.tsx` - Core map UI (~6900 lines)
- `/app/components/NavigationHUD.tsx` - Turn-by-turn instruction card
- `/app/components/HudLayoutView.tsx` - Display tab UI
- `/app/components/NavPreview.tsx` - Live preview for layout editing
- `/app/utils/hudLayout.ts` - HUD layout persistence
- `/app/utils/mutcdSigns.ts` - MUTCD-compliant SVG sign generation
- `/app/server.ts` - Express backend proxy

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
