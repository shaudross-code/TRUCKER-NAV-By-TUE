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
- **Other views**: Original color scheme (emerald/blue accents)

## What's Been Implemented

### Roads & Highways Overlay System (Apr 5, 2026)
- **Real-Time Traffic Flow**: HERE Traffic API v7 flow data rendered as color-coded polylines (green=freeflow, gold=moderate, red=heavy) — auto-refreshes every 60s, only at zoom 10+
- **Route Reasoning**: Visual explanation of WHY a route was chosen — toll road dashed gold lines with $ badges, truck restriction red highlights, highway preference segments
- **Toggle Controls**: Two new buttons in MapControls (Activity icon for traffic, Route icon for reasoning) with gold highlight active states
- **Backend**: `POST /api/traffic-flow` with bbox parameter, returns shape-referenced flow data

### Core Navigation
- Custom truck routing via HERE API v8.140.0
- Turn-by-turn navigation with voice guidance
- Route comparison (up to 3 alternatives)
- Lane guidance, GPS interpolation

### Real FHWA Standard Road Signs
- Interstate shields via HERE Map Image API + FHWA SVG fallback
- Speed Limit (R2-1), Warning diamonds, Exit guide signs, CMV warnings
- Speed limit sign offset at route start (LEFT of user icon)

### HUD Layout Customization (Display Tab)
- 21 toggleable HUD elements with live sync
- Sign visibility filtering synced with Display tab toggles

### Authentication
- Google Sign-In, Apple Sign-In, Email/Password, Guest login (Firebase Auth)

### Safety, ELD, Offline, Community, AI Crash Detection
- All previously implemented features remain functional

## Key API Endpoints
- `/api/route` - HERE Routing API v8.140.0
- `/api/traffic-flow` - HERE Traffic API v7 (real-time flow with shapes)
- `/api/road-shield` - HERE Map Image API v3
- `/api/traffic-incidents` - HERE Traffic v7
- `/api/crash-prediction` - AI incident analysis
- `/api/poi/ratings`, `/api/poi/parking-predict`, `/api/community/reports`

## Deployment Fix (Apr 5, 2026)
- Replaced hardcoded Firebase Project ID in `server.ts` with `process.env.FIREBASE_PROJECT_ID`
- Moved Google OAuth credentials (CLIENT_ID, CLIENT_SECRET) from hardcoded values to `process.env`
- Added `FIREBASE_PROJECT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to `.env`, `backend/.env`, and supervisor config
- Created `/app/frontend/.env` (empty, required by deployment pipeline)
- Deployed Firebase Hosting (`firebase deploy --only hosting`) for auth handler availability
- Deployment agent confirms: no hardcoded secrets, all env vars properly loaded ✅

## Firebase Auth Fix (Apr 5, 2026)
- Fixed "authorizedDomains is not iterable" error that blocked all OAuth sign-in
- Root cause: Firebase Identity Toolkit API (`/v1/projects`) returns response WITHOUT `authorizedDomains`, AND Firebase Hosting handler.js stuck at v3.7.5 (incompatible with SDK v12)
- Solution: Custom server-side OAuth flow for Google Sign-In:
  - Backend `/api/auth/google` redirects to Google OAuth with Firebase's authorized redirect URI
  - Backend `/api/auth/google/callback` exchanges auth code for ID token
  - Frontend polls popup URL, extracts auth code, calls backend, uses `signInWithCredential`
  - Fetch interceptor in `firebase.ts` patches missing `authorizedDomains` in Identity Toolkit response
- Deployed Firebase Hosting (`firebase deploy --only hosting`) for init.json availability
- Google Sign-In: WORKING (custom OAuth flow)
- Apple Sign-In: PENDING (needs Apple Developer credentials for server-side flow)
- Email Sign-In: WORKING
- Guest Login: WORKING

## Future/Backlog
- NavigationView.tsx refactoring (6800+ lines → target <3000)
- PC*MILER integration (enterprise API key needed)
- Gemini API key rotation / TTS fallback
- Route Safety Score badge on map

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
