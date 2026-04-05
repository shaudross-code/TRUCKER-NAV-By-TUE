# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, customizable UI/HUD layouts, Apple ID & Google Play Store login options, gold & black signature theme.

## Architecture
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Leaflet Maps
- **Backend**: Node.js/Express (server.ts) on port 8001
- **Mobile**: Capacitor (iOS/Android)
- **APIs**: HERE Maps (Routing v8, Discover, Traffic v7, Map Image Shield API), Mapbox (Tiles), Google Maps (Places), Firebase (Auth), Gemini AI (Crash Analysis)
- **Storage**: Firebase Firestore + LocalStorage + File-based JSON

## Brand Theme
- **Primary Gold**: #D4AF37
- **Dark Gold**: #9A7B2C
- **Background Black**: #050505, #0a0a0a
- **Accent**: Gold on dark backgrounds, black text on gold surfaces
- **Safety Red**: Preserved for danger/warning states only

## What's Been Implemented

### Core Navigation
- Custom truck routing via HERE API v8.140.0
- Turn-by-turn navigation with voice guidance
- Route comparison (up to 3 alternatives)
- Lane guidance with dynamic lane visualization
- GPS interpolation for smooth marker movement

### Gold & Black Theme (Apr 5, 2026)
- Signature TRUCKERS NAV gold (#D4AF37) and black theme applied across ALL components
- Dashboard, Navigation, MapControls, ELD Logs, Community, Facility Panel, POI Detail, etc.
- All emerald/blue/green/purple/indigo/cyan/teal/sky colors replaced with gold
- Red colors preserved for safety-critical warnings
- Consistent across 22+ component files

### Real FHWA Standard Road Signs (Apr 5, 2026)
- Interstate shields (M1-1) via HERE Map Image API + FHWA SVG fallback
- US Route (M1-4), State Route shields
- Speed Limit (R2-1), Warning diamonds (W-series), Exit guide signs
- CMV warnings, Truck restrictions, No Hazmat, Low Clearance
- Speed limit sign offset at route start (LEFT of user icon)

### HUD Layout Customization (Display Tab)
- 21 toggleable HUD elements with live sync between Display tab and Navigation view
- Element resize + drag-and-drop repositioning
- Sign visibility filtering synced with Display tab toggles

### Authentication
- Google Sign-In, Apple Sign-In, Email/Password, Guest login (Firebase Auth)

### Safety & Alerts
- Real-time traffic incident overlays + auto-reroute
- Speed Limit Warning System (visual + audio)
- Truck restriction warnings, Weather alerts

### Other Features
- ELD Logs (FMCSA-compliant), Offline Maps, Community Data Layer
- AI Crash Detection (Gemini), Facility Ratings, Parking Predictions
- Viewport-Based Sign Culling

### iOS/Android Store Submission (Finalized Apr 5, 2026)
- Capacitor config: com.tue.truckersnav, dark splash screen
- STORE_SUBMISSION.md: Full guide with screenshots, permissions, build commands
- Privacy policy: /privacy.html
- Pre-submission checklist updated with Apple Sign-In + gold theme items

## Key API Endpoints
- `/api/route`, `/api/road-shield`, `/api/traffic-incidents`, `/api/crash-prediction`
- `/api/poi/ratings`, `/api/poi/parking-predict`, `/api/community/reports`

## Future/Backlog
- NavigationView.tsx refactoring (6770 lines → target <3000)
- PC*MILER integration (requires paid API key)
- Gemini API key rotation
- Route Safety Score badge on map

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
