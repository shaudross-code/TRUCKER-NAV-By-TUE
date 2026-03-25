# App Signing & Distribution Guide

## 🍎 iOS App Store Signing

### Step 1: Create Apple Developer Account
1. Go to https://developer.apple.com
2. Enroll in Apple Developer Program ($99/year)
3. Complete enrollment (takes 24-48 hours)

### Step 2: Create App ID
```bash
# In Apple Developer Portal:
1. Certificates, Identifiers & Profiles
2. Identifiers → + button
3. App IDs → Continue
4. Description: TRUCKERS NAV By TUE
5. Bundle ID: com.tue.truckersnav (Explicit)
6. Capabilities: Enable "Background Modes" and "Location"
7. Register
```

### Step 3: Create Distribution Certificate
```bash
# On your Mac:
1. Open Keychain Access
2. Keychain Access → Certificate Assistant → Request Certificate from CA
3. Enter your email, select "Saved to disk"
4. Save the .certSigningRequest file

# In Apple Developer Portal:
1. Certificates → + button
2. Select "App Store and Ad Hoc"
3. Upload .certSigningRequest
4. Download certificate
5. Double-click to install in Keychain
```

### Step 4: Create Provisioning Profile
```bash
# In Apple Developer Portal:
1. Profiles → + button
2. Select "App Store"
3. Select your App ID (com.tue.truckersnav)
4. Select your Distribution Certificate
5. Name: "TRUCKERS NAV App Store"
6. Generate and download
7. Double-click to install in Xcode
```

### Step 5: Configure Xcode Project
```bash
# In Xcode:
cd /app
npx cap open ios

# In Xcode Project Settings:
1. Select App target
2. Signing & Capabilities tab
3. Uncheck "Automatically manage signing"
4. Select your Team
5. Provisioning Profile: Select the one you created
6. Bundle Identifier: com.tue.truckersnav
7. Version: 1.0.0
8. Build: 1
```

### Step 6: Archive and Upload
```bash
# In Xcode:
1. Product → Scheme → Edit Scheme
2. Set Run scheme to "Release"
3. Select "Any iOS Device" as target
4. Product → Archive
5. Once archived, click "Distribute App"
6. Select "App Store Connect"
7. Follow prompts to upload
```

---

## 🤖 Android Play Store Signing

### Step 1: Create Google Play Developer Account
1. Go to https://play.google.com/console
2. Pay $25 one-time registration fee
3. Complete account setup

### Step 2: Generate Upload Keystore
```bash
cd /app/android

# Generate keystore (run once, save securely!)
keytool -genkey -v \
  -keystore truckers-nav-upload.keystore \
  -alias truckers-nav-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (SAVE THIS!)
# - Key password (SAVE THIS!)
# - Your name
# - Organization
# - City, State, Country

# IMPORTANT: Back up this keystore file securely!
# If lost, you cannot update your app!
```

### Step 3: Configure Gradle Signing
```bash
# Create /app/android/key.properties
cat > /app/android/key.properties << 'EOF'
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=truckers-nav-key
storeFile=truckers-nav-upload.keystore
EOF

# Add to .gitignore
echo "android/key.properties" >> /app/.gitignore
echo "android/*.keystore" >> /app/.gitignore
```

### Step 4: Update build.gradle
```gradle
# Edit /app/android/app/build.gradle

// Add before android { block
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    
    // Add signing configs
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 5: Build Signed APK/AAB
```bash
cd /app/android

# Build App Bundle (AAB) - Recommended for Play Store
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab

# OR Build APK
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Step 6: Upload to Play Console
```bash
# In Google Play Console:
1. Create new app
2. Fill in store listing
3. Production → Create new release
4. Upload app-release.aab
5. Add release notes
6. Review and roll out
```

---

## 🔐 Security Best Practices

### Keystore Security
- ✅ **NEVER commit** keystores or passwords to Git
- ✅ Store keystore in secure, encrypted location
- ✅ Back up keystore to multiple secure locations
- ✅ Use different keystores for debug/release
- ✅ Document passwords in password manager

### Environment Variables (Alternative to key.properties)
```bash
# Use environment variables in CI/CD
export RELEASE_STORE_FILE=/path/to/keystore
export RELEASE_STORE_PASSWORD=your_password
export RELEASE_KEY_ALIAS=truckers-nav-key
export RELEASE_KEY_PASSWORD=your_key_password

# Update build.gradle to read from env vars
signingConfigs {
    release {
        storeFile file(System.getenv("RELEASE_STORE_FILE") ?: "release.keystore")
        storePassword System.getenv("RELEASE_STORE_PASSWORD")
        keyAlias System.getenv("RELEASE_KEY_ALIAS")
        keyPassword System.getenv("RELEASE_KEY_PASSWORD")
    }
}
```

---

## 📦 Build Commands Reference

### iOS (macOS only)
```bash
# Debug build
cd /app
yarn build
npx cap sync ios
npx cap open ios
# Build in Xcode (Cmd+B)

# Release build
# In Xcode: Product → Archive
```

### Android (Any OS)
```bash
# Debug build
cd /app
yarn build
npx cap sync android
npx cap open android
# Build in Android Studio

# Release build (signed)
cd /app/android
./gradlew bundleRelease

# Test release build locally
./gradlew installRelease
```

---

## 🚀 Continuous Integration Setup

### GitHub Actions Example
```yaml
name: Build and Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: yarn install
      - name: Build web assets
        run: yarn build
      - name: Sync Capacitor
        run: npx cap sync android
      - name: Build AAB
        run: |
          cd android
          ./gradlew bundleRelease
        env:
          RELEASE_STORE_PASSWORD: ${{ secrets.RELEASE_STORE_PASSWORD }}
          RELEASE_KEY_PASSWORD: ${{ secrets.RELEASE_KEY_PASSWORD }}
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.SERVICE_ACCOUNT_JSON }}
          packageName: com.tue.truckersnav
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: production
```

---

## ✅ Pre-Distribution Checklist

### iOS
- [ ] Apple Developer Account active
- [ ] App ID created
- [ ] Distribution certificate installed
- [ ] Provisioning profile created and installed
- [ ] Xcode project configured with correct Bundle ID
- [ ] Version and build numbers updated
- [ ] App archived successfully
- [ ] TestFlight beta tested (recommended)

### Android
- [ ] Google Play Developer Account active
- [ ] Keystore generated and backed up
- [ ] key.properties configured (or env vars)
- [ ] build.gradle signing config added
- [ ] Signed AAB builds successfully
- [ ] Tested signed build on device
- [ ] ProGuard rules configured (if using obfuscation)

---

## 📱 Version Management

### iOS
```bash
# Update version in Xcode:
# 1. Select project in navigator
# 2. General tab
# 3. Identity section
# 4. Version: 1.0.0
# 5. Build: 1 (increment for each upload)
```

### Android
```gradle
# Update in android/app/build.gradle:
defaultConfig {
    versionCode 1      // Integer, increment each release
    versionName "1.0.0" // User-visible version string
}
```

---

## 🆘 Troubleshooting

### iOS: "Code signing identity not found"
```bash
# Solution:
1. Open Keychain Access
2. Check for valid Distribution certificate
3. If missing, regenerate in Apple Developer Portal
4. Download and install
```

### Android: "Failed to find Build Tools"
```bash
# Solution:
1. Open Android Studio
2. Tools → SDK Manager
3. SDK Tools tab
4. Install Android SDK Build-Tools
```

### Android: "Keystore was tampered with, or password incorrect"
```bash
# Solution:
1. Verify password in key.properties
2. Try keystore password as both store and key password
3. If lost, you must generate new keystore
   (New apps only - existing apps cannot be updated!)
```

---

**Store signing configured! Ready for distribution after testing.**
