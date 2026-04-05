# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, customizable UI/HUD layouts, Apple ID & Google Play Store login options, gold & black signature theme, roads/highways overlay system.

## Architecture
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Leaflet Maps
- **Backend**: Node.js/Express (server.ts) on port 8001
- **Mobile**: Capacitor (iOS/Android)
- **APIs**: HERE Maps (Routing v8, Discover, Traffic v7, Map Image Shield API), Mapbox (Tiles), Google Maps (Places), Firebase (Auth), Gemini AI (Crash Analysis)

## Brand Theme
- **Primary Gold**: #D4AF37 (Navigation View only)
- **Background Black**: #050505, #0a0a0a

## What's Been Implemented

### POI System Cleanup & Weigh Stations (Apr 5, 2026)
- **EV Charging Removed**: EV charging POIs (Tesla, ChargePoint, Electrify America, etc.) are now excluded from the entire POI system — no markers, no amenity badges, no filter entries
- **Real Weigh Station Alerts**: Replaced fake halfway-point simulation with real POI-based detection. Alerts trigger when an actual DOT weigh station POI is within 3 miles of the driver's position
- **Certified Scales**: CAT Scale / Certified Scale POIs remain in the filter menu and are displayed at truck stops
- **Amenity Filtering**: EV-related amenity strings are stripped from popup HTML and detail modal views
- **Fresh Defaults for New Users**: New users start with clean slate ($0.00 metrics, default settings). Migration only runs for the first user who owned pre-existing global data — subsequent new users are never contaminated

### Coming Soon Overlays, Multi-User Storage & Tutorial (Apr 5, 2026)
- **Coming Soon Overlay**: Load Board and Truck Stops views now show a gold-themed "Coming Soon — In Development" overlay with blurred background, construction icon, and progress indicator
- **Multi-User Data Isolation**: All localStorage keys are now prefixed with the Firebase user UID. Each user gets isolated settings, HUD layout, navigation preferences, POI filters, route history, and cached data. Migration runs automatically on first login.
- **Interactive Tutorial**: 5-step onboarding walkthrough (Truck Profile → Dashboard → Navigation → Display Layout → Fuel Network) with gold-themed cards, step dots, progress bar, Skip button, and tip badges. Shows on first login, replayable via Settings > "Replay Tutorial"

### POI Marker Clustering (Apr 5, 2026)
- Replaced `L.layerGroup()` with `L.markerClusterGroup()` for POI markers
- Gold-themed cluster badges, expands at zoom 16+, capped at 200 nearest markers
- Chunked loading (100ms intervals) prevents UI thread blocking

### Map & Alert Improvements (Apr 5, 2026)
- Thicker traffic flow lines (weight 5/7/9), smoother rendering (smoothFactor 2)
- Clickable & collapsible warning alerts with detail modals
- Weather Overlay resizable (XS-XL) in Display Layout
- POI added to Display Layout with brand icons

### Roads & Highways Overlay System
- Real-Time Traffic Flow via HERE Traffic API v7
- Route Reasoning visualization
- Toggle Controls in MapControls

### Authentication & Guest Session (Apr 5, 2026)
- **Google Sign-In Fixed**: Replaced Firebase's broken `__/auth/handler` redirect with Google Identity Services (GSI) popup flow. Eliminates "missing initial state" error in Safari and storage-partitioned browsers. Flow: GSI popup → Google consent → auth code → `/api/google-auth-exchange` → `signInWithCredential`
- **Apple Sign-In Disabled**: Button removed from login screen entirely (pending Apple Developer credentials)
- **Guest 2-Hour Time Limit**: Guest sessions expire after 2 hours. Red countdown timer badge appears at 30 min. Warning overlay (app still visible behind) at 5min/1min/30sec with "Create Account" and "Sign In with Google" buttons
- **Session Storage**: Guest timer uses sessionStorage (resets per browser tab)

### Core Features
- Custom truck routing via HERE API v8.140.0
- Turn-by-turn navigation with voice guidance
- MUTCD-compliant road signs (Interstate shields, Speed Limits, etc.)
- 22 toggleable HUD elements with resize/reorder
- Google Sign-In (custom server-side OAuth), Email/Password, Guest login

## Key Files
- `/app/components/ComingSoonOverlay.tsx` - Coming Soon overlay
- `/app/components/TutorialOverlay.tsx` - 5-step tutorial
- `/app/utils/userStorage.ts` - User-scoped localStorage utility
- `/app/utils/hudLayout.ts` - HUD layout with user-scoped storage
- `/app/components/NavigationView.tsx` - Core map UI (~6970 lines)

## Key API Endpoints
- `/api/route` - HERE Routing API v8.140.0
- `/api/traffic-flow` - HERE Traffic API v7
- `/api/auth/google` & `/api/auth/google/callback` - Custom OAuth

## Future/Backlog
- Refactor NavigationView.tsx (6970+ lines)
- PC*MILER integration
- Gemini API key rotation / TTS fallback
- Route Safety Score badge
- Apple Sign-In (blocked on credentials)
- Viewport-based sign culling

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
