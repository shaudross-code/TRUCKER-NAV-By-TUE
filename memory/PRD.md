# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, customizable UI/HUD layouts, Apple ID & Google Play Store login options.

## Architecture
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Leaflet Maps
- **Backend**: Node.js/Express (server.ts) on port 8001
- **Mobile**: Capacitor (iOS/Android) with EAS Build CI/CD
- **APIs**: HERE Maps (Routing v8, Discover, Traffic v7), Mapbox (Tiles), Google Maps (Places), Firebase (Auth), Gemini AI (Crash Analysis)
- **Storage**: Firebase Firestore + LocalStorage (guest config) + File-based JSON (ratings, parking, community reports)

## What's Been Implemented

### Core Navigation
- Custom truck routing via HERE API v8.140.0
- Turn-by-turn navigation with voice guidance
- Route comparison (up to 3 alternatives)
- Lane guidance with dynamic lane visualization
- GPS interpolation for smooth marker movement

### Map Features
- 2D satellite/street maps with Mapbox + Leaflet
- 3D mode via MapLibre GL
- Custom Leaflet panes (routePane, signPane)
- Collapsible map controls
- Numbered waypoint markers, MUTCD highway shields

### Safety & Alerts
- Real-time traffic incident overlays + auto-reroute countdown
- Truck restriction warnings (bridges, weight, tunnel, hazmat)
- CMV warning signs (steep grades, rollover risk)
- Speed limit display (MUTCD-style signs on map)
- Weather alerts and route hazard reports

### Speed Limit Warning System
- Visual: Speed turns red + pulse animation when exceeding limit + tolerance
- Audio: 880Hz beeps every 3s while speeding (Web Audio API)
- "SLOW DOWN" banner with current vs limit speed
- Configurable tolerance: +0/+3/+5/+8/+10 mph

### Facility Ratings & Reviews
- 1-5 star rating with 8 preset tags
- Text reviews (200 char), along-route POI cards
- Min rating filter in MapControls (ALL/1+/2+/3+/4+)
- Backend: File-based JSON (`/app/data/facility_ratings.json`)

### HUD Layout Customization (Display Tab)
- 21 toggleable HUD elements
- Element resize (XS/S/M/L/XL) + drag-and-drop repositioning
- NavPreview with Compass Rose + Next Stop mockups
- Persistent via LocalStorage
- **Live sync between Display tab and Navigation view** (Apr 2, 2026)
- **Sign visibility filtering**: toggling off signs in Display tab instantly removes them from the map

### Authentication (Apr 2, 2026)
- Google Sign-In via Firebase GoogleAuthProvider
- **Apple Sign-In** via Firebase OAuthProvider('apple.com')
- Email/Password registration and login
- Guest/Anonymous login
- Note: Apple Sign-In requires Apple Developer account + Firebase Console setup to work

### ELD Logs
- FMCSA-compliant ELD interface synced with Dashboard
- Status controls: Off Duty, Sleeper Berth, On Duty, Driving
- Daily summary cards, visual timeline graph, violation detection
- CSV export, date navigation, global auto-logging via HOSProvider

### Offline Maps
- Real tile pre-fetching via Service Worker (OSM tiles)
- 5 US regions with actual tile count estimates
- Cache storage with LIVE size reporting from SW
- Progress reporting via postMessage during downloads
- Automatic cache-first serving when offline

### Community Data Layer
- Real-time trucker reports: parking, fuel price, weigh station, road hazard, road condition
- Quick preset reports + custom submissions
- Upvote system for report reliability
- Auto-expiry: hazard/weigh station (4h), others (24h)
- Category filter stats bar, live feed sorted by recency
- Backend: `/api/community/reports` (GET/POST), `/api/community/reports/:id/upvote` (POST)

### AI Crash/Incident Detection
- Fetches real-time incidents from HERE Traffic API v7 along route corridor
- Gemini AI analysis: risk score (1-10), 3 specific warnings, recommended action, estimated delay
- Fallback heuristic when Gemini unavailable or no incidents
- Backend: `POST /api/crash-prediction` with bbox or routeCoords

### Viewport-Based Sign Culling
- Signs stored in `signDataStoreRef` via extracted `useSignPlacement` hook
- `syncVisibleSigns()` renders only signs within padded viewport (+20%) AND whose category is enabled in hudLayout
- All 7 placement functions extracted to `/app/hooks/useSignPlacement.ts`
- HUD config extracted to `/app/hooks/useHudConfig.ts`

### Code Refactoring
- Extracted sign placement system (~380 lines) into `hooks/useSignPlacement.ts`
- Extracted HUD config management into `hooks/useHudConfig.ts`
- Deleted dead code: `GoogleMapsNavigationView.tsx`
- NavigationView.tsx: 7150 -> ~6770 lines

### iOS/Android Store Submission Setup
- Production Capacitor config (webContentsDebuggingEnabled=false)
- Full store submission guide: `STORE_SUBMISSION.md`
- Privacy policy page: `/public/privacy.html`

### Parking Predictions
- Time-of-day based availability forecasting
- 6-hour forecast with fill percentage
- Backend: `GET /api/poi/parking-predict`

## Key API Endpoints
- `/api/route` - HERE Routing API v8.140.0
- `/api/traffic-incidents` - HERE Traffic v7
- `/api/crash-prediction` - AI incident analysis (HERE + Gemini)
- `/api/poi/ratings` (POST/GET), `/api/poi/ratings/batch` (POST)
- `/api/poi/parking-status` (POST/GET), `/api/poi/parking-predict` (GET)
- `/api/community/reports` (GET/POST), `/api/community/reports/:id/upvote` (POST)

## Upcoming Tasks
- None currently queued

## Future/Backlog
- Continue NavigationView.tsx refactoring (6770 lines -> target <3000)
- PC*MILER integration (requires paid API key)
- Surface AI crash prediction as live Route Safety Score badge on map

## Key Files
- `/app/components/NavigationView.tsx` - Core map UI (~6770 lines)
- `/app/components/LoginScreen.tsx` - Login with Google, Apple, Email, Guest
- `/app/components/FirebaseProvider.tsx` - Firebase Auth (Google, Apple, Email, Guest)
- `/app/hooks/useSignPlacement.ts` - Sign placement + viewport culling + visibility filter
- `/app/hooks/useHudConfig.ts` - HUD layout/positions/scales management with event sync
- `/app/STORE_SUBMISSION.md` - iOS/Android store submission guide
- `/app/public/privacy.html` - Privacy policy page

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
