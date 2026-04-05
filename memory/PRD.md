# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build app from GitHub repository TRUCKER-NAV-By-TUE. Implement real POIs using HERE Maps API, turn-by-turn navigation, real-time traffic/infrastructure alerts, 3D/2D satellite maps. High-quality professional trucking GPS interface, dynamic map switching, real-time hazard alerts (hazmat, bridges, weight), custom fuel network POI tracking, CMV warning systems, smooth GPS interpolation, MUTCD-compliant official road signs, customizable UI/HUD layouts, Apple ID & Google Play Store login options.

## Architecture
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Leaflet Maps
- **Backend**: Node.js/Express (server.ts) on port 8001
- **Mobile**: Capacitor (iOS/Android)
- **APIs**: HERE Maps (Routing v8, Discover, Traffic v7, Map Image Shield API), Mapbox (Tiles), Google Maps (Places), Firebase (Auth), Gemini AI (Crash Analysis)
- **Storage**: Firebase Firestore + LocalStorage (guest config) + File-based JSON

## What's Been Implemented

### Core Navigation
- Custom truck routing via HERE API v8.140.0
- Turn-by-turn navigation with voice guidance
- Route comparison (up to 3 alternatives)
- Lane guidance with dynamic lane visualization
- GPS interpolation for smooth marker movement

### Real FHWA Standard Road Signs (Apr 5, 2026)
- **Interstate Highway Shields (M1-1)**: Real PNG images from HERE Map Image API (`/api/road-shield`), with FHWA-spec SVG fallback (gradient blue field, red crown)
- **US Route Shields (M1-4)**: Black shield, white interior, proper MUTCD double border
- **State Route Shields**: Circular with proper MUTCD specifications
- **Speed Limit Signs (R2-1)**: Regulatory white sign with double inset border, FHWA proportions (4:5 aspect), sign post element
- **Warning Diamonds (W-series)**: Yellow/orange with double inset border per MUTCD standard
- **Exit Guide Signs**: Green FHWA guide signs with EXIT number tabs
- **Truck Restriction Signs**: No Trucks (R5-2), Weight Limit (R12-1), No Hazmat, Low Clearance (W12-2), Tunnel Warning
- **CMV Warnings**: Steep Grade (W7-1), Rollover Risk (W1-8), Winding Road (W1-5)
- **Speed Limit Sign Offset**: First sign on route offset to LEFT of user icon to prevent overlap

### HUD Layout Customization (Display Tab)
- 21 toggleable HUD elements with live sync between Display tab and Navigation view
- Element resize (XS/S/M/L/XL) + drag-and-drop repositioning
- Sign visibility filtering: toggling off signs in Display tab instantly removes them from the map
- Persistent via LocalStorage

### Authentication (Apr 2, 2026)
- Google Sign-In via Firebase GoogleAuthProvider
- **Apple Sign-In** via Firebase OAuthProvider('apple.com') — requires Apple Developer + Firebase Console setup
- Email/Password registration and login
- Guest/Anonymous login

### Safety & Alerts
- Real-time traffic incident overlays + auto-reroute countdown
- Truck restriction warnings (bridges, weight, tunnel, hazmat)
- Speed Limit Warning System (visual + audio)
- Weather alerts and route hazard reports

### Other Features
- ELD Logs (FMCSA-compliant, synced with Dashboard)
- Offline Maps (Service Worker tile caching)
- Community Data Layer (trucker-reported incidents)
- AI Crash/Incident Detection (Gemini)
- Viewport-Based Sign Culling (performance)
- Facility Ratings & Reviews
- Parking Predictions
- iOS/Android Store Submission Setup

## Key API Endpoints
- `/api/route` - HERE Routing API v8.140.0
- `/api/road-shield` - HERE Map Image API v3 (real shield PNGs)
- `/api/traffic-incidents` - HERE Traffic v7
- `/api/crash-prediction` - AI incident analysis
- `/api/poi/ratings`, `/api/poi/parking-predict`, `/api/community/reports`

## Future/Backlog
- Continue NavigationView.tsx refactoring (6770 lines → target <3000)
- PC*MILER integration (requires paid API key)
- Route Safety Score badge on map
- Gemini API key rotation (current key flagged as leaked)

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
