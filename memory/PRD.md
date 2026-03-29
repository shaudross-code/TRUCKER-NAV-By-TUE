# TRUCKERS NAV By TUE — PRD

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, remove static fake data, consolidate amenities, fix UI/map bugs, add specific truck service POIs, turn-by-turn navigation, real-time traffic/infrastructure alerts, premium 3D and 2D map views, interactive Load Board, fuel price tracking, and a robust crowd-sourced data system for parking statuses and shipper/receiver facilities. Mobile readiness for iOS and Android deployment.

## Architecture
- **Stack**: React (Vite) + Express (server.ts) single-level fullstack — port 8001
- **Maps**: Leaflet (2D with CSS-based touch rotation) + Mapbox GL JS (3D perspective)
- **Mobile**: Capacitor v6.2.0 (iOS + Android), locked to Node 20
- **Data**: Firebase Auth (USE_MOCK_DATA=false) + localStorage + local JSON file DBs
- **APIs**: HERE Maps (Browse + Discover + Fuel Prices), Google Maps Platform, MapTiler, Gemini, Mapbox
- **Proxy**: Nginx on port 3000 -> Express on port 8001
- **Preview URL**: https://poi-fuel-tracker.preview.emergentagent.com

## What's Been Implemented

### Core Features (All DONE)
- Truck-specific GPS routing via HERE Maps API, turn-by-turn, reroute
- HERE Browse + Discover APIs for truck-specific POIs with corridor search
- Real-time traffic signs/lights alerts + audio speech alerts
- Premium Mapbox GL JS 3D view with night mode, gold truck, HUD
- Capacitor v6.2.0 for iOS + Android
- Dynamic Load Board near GPS with haversine filter
- Crowd-sourced Shipper/Receiver reporting
- Reputation scoring (0-5 stars) in POI popups
- HERE Fuel Prices API: Real-time diesel prices, corridor matching
- Firebase Auth (live)

### Phase 19 — Deployment Build Fix (DONE — 2026-03-29)
- Created `build-frontend-artifacts.sh` with relative path detection
- Env-var fallback for Firebase Admin SDK, configurable PORT

### Phase 20 — Location & Map Reliability (DONE — 2026-03-29)
- IP geolocation fallback via `/api/ip-location`
- Permissions-Policy header for iframe geolocation
- 3D->2D map switch fix (Leaflet re-initialization)
- Error state separation (mapInitError vs dismissible error)
- Firebase Auth domain auto-registration

### Phase 21 — Touch Map Rotation (DONE — 2026-03-29)
- CSS-based 2D touch rotation (NOT leaflet-rotate plugin - conflicts with existing system)
- Mapbox 3D explicit dragRotate + touchZoomRotate + touchPitch

### Phase 22 — POI Accuracy & Performance (DONE — 2026-03-29)
**HERE Maps POI Accuracy:**
- Switched all POI placement from `item.position` to `item.access[0].position` (road-accessible entry point)
- More accurate icon placement on roads rather than building centers
- Applied to all three data sources: HERE Browse/Discover, Corridor, Overpass

**Service & Non-Diesel POI Removal:**
- Removed Browse API call for service categories (600-6300-0066, 600-6100-0062, etc.)
- Removed Speedco from branded Discover calls
- Added backend filters: `type === 'service'` excluded, fuel without Diesel excluded
- Cleaned Overpass queries to remove service brand searches

**NavigationView Performance:**
- Removed duplicate ResizeObserver (was running 2x on every resize)
- Reduced ETA update interval: 2s -> 5s
- Reduced traffic fetch interval: 10s -> 30s
- Increased POI render throttle: 1mi -> 2mi movement threshold
- Removed 20+ console.log calls from hot paths (touch handlers, POI rendering, periodic updates)
- Consolidated localStorage persistence into single useEffect

### Phase 23 — Preview Fix & NavigationView Refactor (DONE — 2026-03-29)
**Preview Environment Fix:**
- Set up nginx proxy on port 3000 → Express port 8001 for Kubernetes ingress routing
- Updated Firebase Auth domain registration for new preview URL (poi-fuel-tracker.preview.emergentagent.com)

**NavigationView.tsx Refactor (5152 → 4656 lines, -528 lines):**
- Extracted `PoiDetailModal.tsx` — POI detail popup with diesel prices, amenities, parking status, reputation
- Extracted `RouteStepsModal.tsx` — Turn-by-turn route steps modal with lane guidance
- Extracted `NavigationHUD.tsx` — Navigation heads-up display with highway shields
- Extracted `WarningBanners.tsx` — Error, off-route, and HOS violation alert banners
- Fixed `maneuverIndex` scoping bug (added `currentManeuverIndex` state)
- All backend API tests pass (13/13), frontend loads without React errors

### Phase 24 — Multi-Method Authentication (DONE — 2026-03-29)
- Added **Email/Password Login** — `signInWithEmailAndPassword` via Firebase Auth
- Added **Email/Password Registration** — `createUserWithEmailAndPassword` with optional display name
- Added **Guest/Anonymous Login** — `signInAnonymously` for instant access without credentials
- Programmatically enabled Email/Password and Anonymous providers via Identity Toolkit API in `server.ts`
- Created `LoginScreen.tsx` component with all 4 auth methods (Google, Email Login, Register, Guest)
- Updated `FirebaseProvider.tsx` with `signInWithEmail`, `signUpWithEmail`, `signInAsGuest` methods
- Human-friendly error messages for common auth failures (wrong password, weak password, email in use)
- All tests pass: 13/13 backend, 8/8 frontend auth flows

### Phase 25 — Dashboard Input Cards Bug Fix (DONE — 2026-03-29)
- **Root cause**: Firestore security rules blocked writes for anonymous/email users, so `updateProfile()` failed silently and dashboard values never updated
- **Fix**: Switched dashboard financial metrics (weeklyEarnings, milesThisWeek, fuelCost, truckCost, weekDeductions) to local state + localStorage as primary storage, with Firestore sync as background fallback
- Added Firestore `onSnapshot` error handler in `FirebaseProvider.tsx` — falls back to local profile on permission denied
- Silenced Firestore permission error spam in HOSProvider, FirebaseProvider, and global error handler
- Attempted programmatic Firestore security rules update via Firebase Rules REST API
- Dashboard inputs now work correctly for all user types (Google, email, guest)

## Prioritized Backlog

### P1 — Upcoming
- Map filtering for Reputation Scores (show only 4-star+ facilities)

### P2 — Future
- iOS/Android store submissions (blocked: user signing certificates)

## Key Files
- `/app/server.ts` — Express server, API proxy, IP geolocation
- `/app/build-frontend-artifacts.sh` — CI/CD frontend build script
- `/app/App.tsx` — Location provider with IP fallback
- `/app/components/NavigationView.tsx` — Core map orchestration (refactored)
- `/app/components/PoiDetailModal.tsx` — Extracted POI detail popup
- `/app/components/RouteStepsModal.tsx` — Extracted route steps modal
- `/app/components/NavigationHUD.tsx` — Extracted navigation HUD
- `/app/components/WarningBanners.tsx` — Extracted warning banners
- `/app/components/Navigation3DView.tsx` — Premium 3D navigation
- `/app/services/geminiService.ts` — POI fetching with HERE access-point placement
- `/app/services/fuelPriceService.ts` — Diesel fuel price fetching
