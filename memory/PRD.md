# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, and customizable UI/HUD layouts.

## Architecture
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Leaflet Maps
- **Backend**: Node.js/Express (server.ts) on port 8001
- **Mobile**: Capacitor (iOS/Android) with EAS Build CI/CD
- **APIs**: HERE Maps (Routing v8, Discover, Traffic), Mapbox (Tiles), Google Maps (Places), Firebase (Auth), Gemini AI
- **Storage**: Firebase Firestore + LocalStorage (guest config) + File-based JSON (ratings, parking)

## What's Been Implemented (Completed)

### Core Navigation
- Custom truck routing via HERE API v8.140.0
- Turn-by-turn navigation with voice guidance
- Route comparison (up to 3 alternatives with time/distance/fuel cost)
- Lane guidance with dynamic lane visualization
- Maneuver previews with upcoming turn info
- GPS interpolation for smooth marker movement

### Map Features
- 2D satellite/street maps with Mapbox + Leaflet
- 3D mode via MapLibre GL
- Custom Leaflet panes (routePane, signPane)
- Collapsible map controls (zoom, tilt, compass)
- Numbered waypoint markers
- Highway shield markers (MUTCD-compliant)

### Safety & Alerts
- Real-time traffic incident overlays + auto-reroute countdown
- Truck restriction warnings (bridges, weight, tunnel, hazmat)
- CMV warning signs (steep grades, rollover risk)
- Speed limit display (MUTCD-style signs on map)
- Weather alerts and route hazard reports

### Speed Limit Warning System
- Visual Warning: Speed display turns red with glow + pulse animation when exceeding speed limit + tolerance
- Audio Alert: 880Hz square wave beeps every 3 seconds while speeding (Web Audio API)
- "SLOW DOWN" Banner: Red banner above Arrival Bar showing current vs limit speed
- Configurable Tolerance: +0, +3, +5 (default), +8, +10 mph tolerance in Display tab
- Toggle: 21st element in Display Layout tab with siren icon

### Facility Ratings & Reviews System
- Star Rating: 1-5 star input with hover effects in POI Detail Modal
- Review Tags: 8 preset tags (Clean Restrooms, Good Food, Safe Parking, Fast Fuel, Friendly Staff, Showers, Truck Wash, WiFi)
- Text Reviews: Optional 200-char review text
- Along Route POI Cards: Average rating stars displayed next to fuel price
- Min Rating Filter: ALL/1+/2+/3+/4+ filter in MapControls panel
- Backend API: File-based JSON store (`/app/data/facility_ratings.json`)

### Professional Lane Guidance System
- Visual LaneRibbon: SVG directional arrows with blue highlighting
- Synthesized lane data from HERE API action types
- Voice lane guidance: 7+ distance thresholds

### HUD Layout Customization (Display Tab)
- 21 toggleable HUD elements (Navigation/Panels/Signs categories)
- Speed Warning toggle with tolerance control
- Compass Rose + Next Stop toggles
- Element resize system (XS/S/M/L/XL) for 11 resizable elements
- Drag-and-drop repositioning via @dnd-kit
- NavPreview with Compass Rose + Next Stop mockups
- Persistent config via LocalStorage
- Trip Panel Position toggle (LEFT/RIGHT)

### ELD Logs (NEW - Apr 1, 2026)
- FMCSA-compliant Electronic Logging Device interface
- Status controls: Off Duty, Sleeper Berth, On Duty, Driving
- Daily summary cards with hours tracking and progress bars
- Visual timeline graph (Daily Log Graph) with hour labels
- Violation detection: 11-hour driving limit, 14-hour on-duty window, 8-hour break rule
- Status change log table with timestamps
- CSV export functionality
- Date navigation (view historical logs)
- Auto-logging from HOS context
- Persistent storage via localStorage

### Offline Maps (NEW - Apr 1, 2026)
- Download regions: US Midwest, South, Northeast, West, Southeast
- Cache storage summary (total cached, regions count, cached routes)
- Download progress simulation with progress bar
- Online/Offline status indicator
- Service Worker registration for tile caching (sw-tiles.js)
- Cached routes section (last 5 calculated routes auto-saved)
- Clear all cache functionality
- Offline mode tips section

### Parking Predictions API (NEW - Apr 1, 2026)
- Backend endpoint: GET `/api/poi/parking-predict?poiId=xxx&hour=xx`
- Time-of-day based availability forecasting
- Historical pattern algorithm (peak hours 7-9 PM, low 6-10 AM)
- 6-hour forecast with fill percentage per hour
- Status labels: LIKELY OPEN, FILLING UP, FULL SOON, LIKELY FULL
- Blends last known status with time-of-day patterns

### Mobile Build Pipeline
- Capacitor integration for iOS/Android
- GitHub Actions workflow for remote builds
- EAS Build profiles configured

## Key API Endpoints
- `/api/route` - HERE Routing API v8.140.0
- `/api/traffic-incidents` - Traffic incident data
- `/api/poi/ratings` (POST/GET) - Facility ratings
- `/api/poi/ratings/batch` (POST) - Batch ratings
- `/api/poi/parking-status` (POST/GET) - Parking status updates
- `/api/poi/parking-predict` (GET) - Parking availability predictions
- `/api/facility-ratings` (GET/POST) - Facility ratings
- `/api/facility-ratings-batch` (POST) - Batch facility ratings

## Known Issues
- Intermittent service drops: trucker-nav/frontend supervisor processes

## Upcoming Tasks
- **P1**: Viewport-based sign culling (only render signs currently visible in viewport for DOM performance)

## Future/Backlog
- NavigationView.tsx refactoring (~7000 lines -> smaller hooks/components)
- iOS/Android Store Submission
- Driver reputation/review aggregation and leaderboards

## Key Files
- `/app/components/NavigationView.tsx` - Core map UI (~7000 lines)
- `/app/components/NavigationHUD.tsx` - Turn-by-turn instruction card
- `/app/components/HudLayoutView.tsx` - Display tab UI (21 elements)
- `/app/components/ELDLogView.tsx` - ELD logs interface
- `/app/components/OfflineMapsView.tsx` - Offline maps management
- `/app/components/NavPreview.tsx` - Live preview for layout editing
- `/app/components/PoiDetailModal.tsx` - POI detail with ratings/reviews
- `/app/components/MapControls.tsx` - Map controls with min rating filter
- `/app/utils/hudLayout.ts` - HUD layout persistence
- `/app/server.ts` - Express backend proxy + all APIs
- `/app/public/sw-tiles.js` - Service Worker for tile caching

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
