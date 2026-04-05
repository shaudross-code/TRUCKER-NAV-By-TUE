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

### Map & Alert Improvements (Apr 5, 2026)
- **Thicker Traffic Flow Lines**: Road/highway overlaps now use weight 5/7/9 (up from 3/4/5) with smoothFactor 2 for smoother rendering
- **Clickable Warning Alerts**: Truck Restrictions, Traffic Alerts, and Weather Hazards are now clickable, opening a detail modal with type, severity, location, and route progress info
- **Collapsible Warning Alerts**: Each alert panel has an X button to collapse to a compact "+" badge with count, freeing map space
- **Alert Detail Modal**: Gold-themed modal with dismiss button showing detailed alert information
- **Weather Overlay Resizable**: Weather Overlay now supports XS/S/M/L/XL size controls in the Display Layout
- **POI in Display Layout**: "Along Route" panel renamed to "POI" and added as a toggleable element in the Display Layout (Panels category)
- **Brand Icons in POI List**: POI entries now show brand-specific SVG icons (Love's, Pilot, TA, Shell, etc.) instead of generic lucide icons

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
- 22 toggleable HUD elements with live sync (including new POI toggle)
- Sign visibility filtering synced with Display tab toggles
- Drag-to-reorder, resize (XS-XL), position editing
- Weather Overlay now resizable

### Authentication
- Google Sign-In (custom server-side OAuth flow), Email/Password, Guest login (Firebase Auth)
- Apple Sign-In: PENDING (needs Apple Developer credentials)

### Safety, ELD, Offline, Community, AI Crash Detection
- All previously implemented features remain functional

## Key API Endpoints
- `/api/route` - HERE Routing API v8.140.0
- `/api/traffic-flow` - HERE Traffic API v7 (real-time flow with shapes)
- `/api/road-shield` - HERE Map Image API v3
- `/api/traffic-incidents` - HERE Traffic v7
- `/api/crash-prediction` - AI incident analysis
- `/api/poi/ratings`, `/api/poi/parking-predict`, `/api/community/reports`
- `/api/auth/google` & `/api/auth/google/callback` - Custom OAuth

## Firebase Auth Fix (Apr 5, 2026)
- Custom server-side OAuth flow for Google Sign-In (bypasses broken Firebase handler.js v3.7.5)
- DO NOT revert to signInWithPopup

## Future/Backlog
- NavigationView.tsx refactoring (6900+ lines -> target <3000)
- PC*MILER integration (enterprise API key needed)
- Gemini API key rotation / TTS fallback
- Route Safety Score badge on map
- Apple Sign-In (blocked on credentials)
- Viewport-based sign culling

## Preview URL
https://hud-customizer-5.preview.emergentagent.com
