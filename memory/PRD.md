# TRUCKERS NAV By TUE - Product Requirements Document

## Original Problem Statement
Build a professional trucking GPS navigation application with:
- Real POIs using HERE Maps API
- Turn-by-turn navigation with voice guidance
- Real-time traffic/infrastructure alerts
- 3D/2D satellite maps with dynamic switching
- MUTCD-compliant official US road signs
- Customizable UI/HUD layouts
- Custom fuel network POI tracking
- CMV warning systems
- Multi-user support with Google Sign-In
- Timed guest sessions (2 hours)
- Gold/black themed navigation interface

## Architecture
- **Frontend**: React + Vite + TypeScript + Leaflet
- **Backend**: Node.js + Express (port 8001)
- **Frontend Proxy**: Nginx (port 3000)
- **Auth**: Firebase Auth (Google via custom token flow, Email/Password, Anonymous/Guest)
- **Database**: Firebase Firestore + localStorage (user-scoped)
- **Maps**: HERE Maps API (routing v8), Mapbox (tiles), Google Maps (Places API)

## Preview URL
https://hud-customizer-5.preview.emergentagent.com

## Completed Features
- [x] Core navigation with HERE API truck routing (v8.140.0)
- [x] MUTCD-compliant vector road signs (Interstate shields, US Routes, Speed Limits, Warnings)
- [x] Real-time traffic incident overlays with auto-reroute countdown
- [x] Collapsible map controls with hamburger button
- [x] Waypoint numbered markers on route
- [x] Customizable HUD Layout editor (Display tab in sidebar)
- [x] Voice announcements and lane guidance
- [x] POI marker clustering (leaflet.markercluster)
- [x] Coming Soon overlays (Load Board, Truck Stops)
- [x] Multi-user localStorage scoping (userStorage.ts)
- [x] Tutorial overlay for new users
- [x] Weigh Stations / Certified Scales POIs
- [x] 2-hour Guest Session Timer with countdown warnings
- [x] Google Sign-In (full-page redirect + Firebase custom token) - FIXED
- [x] Clean slate truck profile for new users - DONE

## Google Sign-In Implementation Details
- Uses full-page redirect flow (no popups - avoids Safari COOP issues)
- OAuth Client ID: 290977889012-... (user's GCP project "TUE Trucking App")
- Server exchanges Google auth code for tokens, then creates Firebase custom token via Admin SDK
- This bypasses the Firebase project ID mismatch (OAuth client is in different GCP project than Firebase)
- Frontend uses signInWithCustomToken to complete sign-in

## Upcoming Tasks (Priority Order)
1. **P1**: Refactor NavigationView.tsx (~6970 lines) into smaller hooks/components
2. **P2**: Apple Sign-In integration (requires Apple Developer credentials)
3. **P2**: Speed limit warning system
4. **P2**: Map filtering for Reputation Scores

## Future/Backlog
- PC*MILER Data integration (requires enterprise API)
- Route Safety Score badge
- Viewport-based sign culling (performance)
- Driver reputation/review system
- iOS and Android Store Submission

## Key Files
- `/app/components/NavigationView.tsx` - Core map UI (~6970 lines, needs refactoring)
- `/app/components/FirebaseProvider.tsx` - Auth context + Google OAuth
- `/app/components/LoginScreen.tsx` - Login UI
- `/app/components/HudLayoutView.tsx` - HUD customization
- `/app/components/GuestSessionTimer.tsx` - 2hr guest timer
- `/app/server.ts` - Express backend (HERE API, Google OAuth)
- `/app/utils/userStorage.ts` - User-scoped localStorage
- `/app/utils/mutcdSigns.ts` - MUTCD road sign SVG generation

## Known Issues
- NavigationView.tsx is dangerously large (~6970 lines) - needs refactoring
- Apple Sign-In disabled (requires Apple Developer credentials)
