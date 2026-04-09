# TRUCKERS NAV By TUE — App Store Submission Guide

## App Identity
- **App Name**: TRUCKERS NAV By TUE
- **Bundle ID (iOS)**: com.tue.truckersnav
- **Package Name (Android)**: com.tue.truckersnav
- **Version**: 1.0.0
- **Category**: Navigation (primary), Travel (secondary)

## App Store Description

### Short Description (80 chars)
Professional CMV GPS navigation with MUTCD signs, ELD, and community reports.

### Full Description
TRUCKERS NAV is a professional-grade GPS navigation app built specifically for commercial motor vehicle (CMV) drivers. Navigate with confidence using truck-specific routing, real-time hazard alerts, and FMCSA-compliant electronic logging.

FEATURES:
- Truck-specific routing via HERE Maps API v8 — avoids low bridges, weight limits, and restricted roads
- MUTCD-compliant road signs — real US interstate shields, speed limits, curve warnings, and truck restriction signs rendered on the map
- Speed limit warning system — visual + audio alerts when exceeding posted speed
- Real-time traffic incident overlays with automatic reroute suggestions
- FMCSA-compliant ELD logging — track driving hours, violations, and export CSV
- Community data layer — share and view real-time parking, fuel prices, weigh station status, and road hazards
- AI-powered crash detection — incident analysis with risk scoring and driver warnings
- Parking predictions — time-of-day availability forecasting for truck stops
- Offline map support — download regional tile caches for areas without cell coverage
- Customizable HUD layout — drag, resize, and toggle 21 navigation elements
- Lane guidance with synthesized voice instructions
- Route comparison (up to 3 alternatives with time/distance/fuel cost)
- Facility ratings and reviews from the trucker community

DESIGNED FOR TRUCKERS:
- Clean, dark interface optimized for night driving
- Large touch targets for gloved hands
- Professional voice guidance
- HOS timer integration
- Fuel cost estimation per route

### Keywords
truck GPS, CMV navigation, trucker GPS, ELD, electronic logging, truck route, low bridge alert, weight limit, FMCSA, HOS, hours of service, truck stops, fuel prices, parking, commercial vehicle

## Screenshots Required

### iOS (6.7" iPhone)
1. Navigation view with map + highway shields + speed limit signs
2. Route comparison panel with 3 alternatives
3. ELD Logs view with timeline graph
4. Community reports feed with category filters
5. Display layout editor with drag preview
6. Offline maps download regions

### Android (Phone)
Same 6 screenshots as iOS

## Privacy Policy URL
Host at: https://truckersnav.com/privacy (or use the built-in /privacy route)

## Support URL
https://truckersnav.com/support

## Age Rating
4+ (iOS) / Everyone (Android) — No objectionable content

## Permissions Justification

### iOS
| Permission | Usage String |
|------------|-------------|
| Location When In Use | Turn-by-turn navigation, nearby truck stops, traffic info |
| Location Always | Background navigation, ETA updates, hazard alerts |
| Camera | Document scanning for trip logs (optional) |

### Android
| Permission | Purpose |
|------------|---------|
| ACCESS_FINE_LOCATION | GPS-based navigation |
| ACCESS_COARSE_LOCATION | Approximate location for nearby POIs |
| FOREGROUND_SERVICE | Background navigation continuity |
| FOREGROUND_SERVICE_LOCATION | Location updates during active routes |
| INTERNET | Map tiles, routing API, community data |

## Build & Submit

### Prerequisites
1. Apple Developer account ($99/year) — https://developer.apple.com
2. Google Play Developer account ($25 one-time) — https://play.google.com/console
3. EAS CLI configured with Expo token

### Build Commands
```bash
# Production builds via EAS
eas build --platform ios --profile production
eas build --platform android --profile production

# Or via GitHub Actions
# Go to Actions > EAS Build > Run workflow > Select platform + production profile
```

### iOS Submission
```bash
eas submit --platform ios --profile production
```

### Android Submission
```bash
eas submit --platform android --profile production
```

### Or Manual Submission
1. **iOS**: Download .ipa from EAS, upload via Xcode or Transporter app
2. **Android**: Download .aab from EAS, upload to Google Play Console

## Pre-Submission Checklist
- [x] App icons at all required sizes (iOS + Android)
- [x] Splash screen configured (dark theme #050505)
- [x] Location permissions with usage descriptions
- [x] Bundle ID / Package name set
- [x] EAS build profiles configured (development, preview, production)
- [x] GitHub Actions CI/CD workflow ready
- [x] webContentsDebuggingEnabled set to false for production
- [ ] Privacy policy hosted at a public URL
- [ ] Support email/URL ready
- [ ] App Store screenshots captured (6 per platform)
- [ ] App Store description finalized
- [ ] Apple Developer / Google Play accounts active
