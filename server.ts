import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { safeStringify } from './utils';
import admin from 'firebase-admin';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── File-based parking status store ───────────────────────────────────────
const PARKING_STATUS_FILE = path.join(__dirname, 'data', 'parking_status.json');

function readParkingStore(): Record<string, any> {
  try {
    if (!existsSync(PARKING_STATUS_FILE)) return {};
    return JSON.parse(readFileSync(PARKING_STATUS_FILE, 'utf8'));
  } catch { return {}; }
}

function writeParkingStore(data: Record<string, any>) {
  try {
    writeFileSync(PARKING_STATUS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('Failed to write parking store:', e); }
}
// ────────────────────────────────────────────────────────────────────────────

// ─── File-based facility ratings store ─────────────────────────────────────
const RATINGS_FILE = path.join(__dirname, 'data', 'facility_ratings.json');

interface FacilityRating {
  rating: number;
  review?: string;
  tags?: string[];
  userName?: string;
  createdAt: string;
}

interface FacilityEntry {
  poiId: string;
  name: string;
  lat: number;
  lon: number;
  ratings: FacilityRating[];
  averageRating: number;
  totalReviews: number;
}

function readRatingsStore(): Record<string, FacilityEntry> {
  try {
    if (!existsSync(RATINGS_FILE)) return {};
    return JSON.parse(readFileSync(RATINGS_FILE, 'utf8'));
  } catch { return {}; }
}

function writeRatingsStore(data: Record<string, FacilityEntry>) {
  try {
    const dir = path.dirname(RATINGS_FILE);
    if (!existsSync(dir)) { import('fs').then(fs => fs.mkdirSync(dir, { recursive: true })); }
    writeFileSync(RATINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) { console.error('Failed to write ratings store:', e); }
}
// ────────────────────────────────────────────────────────────────────────────

// Initialize Firebase Admin with service account (env var or file fallback)
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Firebase Admin: using FIREBASE_SERVICE_ACCOUNT env var');
  } else {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('Firebase Admin: using serviceAccountKey.json file');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  console.error('Set FIREBASE_SERVICE_ACCOUNT env var or place serviceAccountKey.json in /app');
}

// Programmatically add authorized domains for Firebase Auth
async function addAuthorizedDomains() {
  const PROJECT_ID = 'project-4cbb6ad7-8e65-4988-ae7';
  const domainsToAdd = [
    'poi-fuel-tracker.preview.emergentagent.com',
    'nav-corridor-live.preview.emergentagent.com',
    'navigation-staging.preview.emergentagent.com',
    'localhost',
  ];
  
  try {
    const keyPath = path.join(__dirname, 'serviceAccountKey.json');
    const auth = new GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/identitytoolkit', 'https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`;
    
    // Get current config
    const getRes = await client.request({ url, method: 'GET' });
    const config = getRes.data as any;
    const current = config?.authorizedDomains || [];
    
    const missing = domainsToAdd.filter(d => !current.includes(d));
    if (missing.length === 0) {
      console.log('Firebase Auth: all domains already authorized');
    } else {
      const updated = [...current, ...missing];
      await client.request({
        url,
        method: 'PATCH',
        body: JSON.stringify({ authorizedDomains: updated }),
        headers: { 'Content-Type': 'application/json' },
      });
      console.log(`Firebase Auth: added domains: ${missing.join(', ')}`);
    }

    // Enable Email/Password and Anonymous sign-in providers
    await enableAuthProviders(client, PROJECT_ID);
  } catch (err: any) {
    console.error('Firebase Auth domain registration failed:', err?.message || err);
  }
}

async function enableAuthProviders(client: any, projectId: string) {
  try {
    // Enable Email/Password provider
    const emailUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
    const emailRes = await client.request({ url: emailUrl, method: 'GET' });
    const emailConfig = emailRes.data as any;
    
    const signIn = emailConfig?.signIn || {};
    const emailEnabled = signIn?.email?.enabled;
    const anonEnabled = signIn?.anonymous?.enabled;
    
    if (!emailEnabled || !anonEnabled) {
      const updatedSignIn = {
        signIn: {
          ...signIn,
          email: { enabled: true, passwordRequired: true },
          anonymous: { enabled: true },
        }
      };
      await client.request({
        url: emailUrl,
        method: 'PATCH',
        body: JSON.stringify(updatedSignIn),
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Firebase Auth: enabled Email/Password and Anonymous providers');
    } else {
      console.log('Firebase Auth: Email/Password and Anonymous providers already enabled');
    }
  } catch (err: any) {
    console.error('Firebase Auth: failed to enable providers:', err?.message || err);
    console.error('Please enable Email/Password and Anonymous sign-in in Firebase Console > Authentication > Sign-in method');
  }
}

async function updateFirestoreRules() {
  const PROJECT_ID = 'project-4cbb6ad7-8e65-4988-ae7';
  try {
    const keyPath = path.join(__dirname, 'serviceAccountKey.json');
    const authClient = new GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await authClient.getClient();
    
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read: if request.auth != null;
    }
  }
}`;
    
    // Create a new ruleset
    const rulesetRes = await client.request({
      url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
      method: 'POST',
      body: JSON.stringify({
        source: {
          files: [{ name: 'firestore.rules', content: rules }]
        }
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const rulesetName = (rulesetRes.data as any)?.name;
    if (rulesetName) {
      // Deploy the ruleset to Firestore release
      await client.request({
        url: `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
        method: 'PATCH',
        body: JSON.stringify({ rulesetName }),
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Firestore: security rules updated for all authenticated users');
    }
  } catch (err: any) {
    // Silently skip - local fallback handles permission issues
  }
}
updateFirestoreRules();
addAuthorizedDomains();

async function createServer() {
  const app = express();
  app.use(express.json());

  // Allow geolocation in iframes and set security headers
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(self)');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Health check endpoint for platform monitoring (must be before Vite middleware)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'trucker-nav' });
  });

  // IP-based geolocation fallback when browser geolocation fails
  app.get('/api/ip-location', async (req, res) => {
    try {
      const response = await fetch('http://ip-api.com/json/?fields=lat,lon,city,regionName,country,status');
      const data = await response.json();
      if (data.status === 'success') {
        res.json({ lat: data.lat, lon: data.lon, city: data.city, region: data.regionName, country: data.country });
      } else {
        res.status(500).json({ error: 'IP geolocation failed' });
      }
    } catch (err) {
      res.status(500).json({ error: 'IP geolocation service unavailable' });
    }
  });

  // API routes
  app.post('/api/route', async (req, res) => {
    const { 
      origin, 
      destination, 
      via, 
      truckProfile, 
      avoidTolls, 
      avoidFerries, 
      avoidUnpaved 
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    if (!process.env.HERE_API_KEY) {
      console.error('HERE_API_KEY is missing in environment variables');
      return res.status(500).json({ error: 'HERE API key is not configured on the server' });
    }

    try {
      console.log('Backend: Received truckProfile', safeStringify(truckProfile));

      const height = Number(truckProfile.height) || 13.5;
      const weight = Number(truckProfile.weight) || 80000;
      const length = Number(truckProfile.length) || 53;
      const width = Number(truckProfile.width) || 8.5;
      const axleWeight = Number(truckProfile.axleWeight) || 12000;
      const axleCount = Number(truckProfile.axleCount) || 5;
      const trailerCount = Number(truckProfile.trailerCount) || 1;

      const heightCm = Math.round(height * 30.48);
      const weightKg = Math.round(weight * 0.453592);
      const lengthCm = Math.round(length * 30.48);
      const widthCm = Math.round(width * 30.48);
      const axleWeightKg = Math.round(axleWeight * 0.453592);
      
      // Estimate empty weight as ~35% of gross weight (typical for Class 8 trucks)
      const emptyWeightKg = Math.round(weightKg * 0.35);
      // Standard tire count: 5-axle = 18 tires
      const tiresCount = Number(truckProfile.tiresCount) || (axleCount === 5 ? 18 : axleCount * 4 - 2);
      
      const hereUrl = new URL('https://router.hereapi.com/v8/routes');
      hereUrl.searchParams.append('transportMode', 'truck');
      hereUrl.searchParams.append('origin', origin);
      
      if (via && Array.isArray(via)) {
        via.forEach((wp: string) => {
          hereUrl.searchParams.append('via', wp);
        });
      }
      
      hereUrl.searchParams.append('destination', destination);
      hereUrl.searchParams.append('return', 'summary,actions,instructions,incidents,polyline,turnByTurnActions,elevation,tolls');
      hereUrl.searchParams.append('spans', 'length,truckAttributes,incidents,speedLimit,streetAttributes,names,routeNumbers,notices,functionalClass,maxSpeed,countryCode');
      hereUrl.searchParams.append('vehicle[height]', heightCm.toString());
      hereUrl.searchParams.append('vehicle[grossWeight]', weightKg.toString());
      hereUrl.searchParams.append('vehicle[currentWeight]', weightKg.toString());
      hereUrl.searchParams.append('vehicle[emptyWeight]', emptyWeightKg.toString());
      hereUrl.searchParams.append('vehicle[length]', lengthCm.toString());
      hereUrl.searchParams.append('vehicle[width]', widthCm.toString());
      hereUrl.searchParams.append('vehicle[axleCount]', axleCount.toString());
      hereUrl.searchParams.append('vehicle[weightPerAxle]', axleWeightKg.toString());
      hereUrl.searchParams.append('vehicle[trailerCount]', trailerCount.toString());
      hereUrl.searchParams.append('vehicle[tiresCount]', tiresCount.toString());
      
      if (truckProfile.tunnelCategory && truckProfile.tunnelCategory !== 'NONE') {
        hereUrl.searchParams.append('vehicle[tunnelCategory]', truckProfile.tunnelCategory);
      }

      if (truckProfile.hazmat) {
        const classes = truckProfile.hazmatClasses && truckProfile.hazmatClasses.length > 0 
          ? truckProfile.hazmatClasses.join(',') 
          : 'explosive,gas,flammable,combustible,organic,poison,radioactive,corrosive,poisonousInhalation,harmfulToWater,other';
        hereUrl.searchParams.append('shippedHazardousGoods', classes);
      }

      const avoidList: string[] = [];
      if (avoidTolls) avoidList.push('tollRoad');
      if (avoidFerries) avoidList.push('ferry');
      if (avoidUnpaved) avoidList.push('dirtRoad');
      if (avoidList.length > 0) {
        hereUrl.searchParams.append('avoid[features]', avoidList.join(','));
      }

      hereUrl.searchParams.append('alternatives', '2');
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);

      console.log('Backend: Calling HERE API:', hereUrl.toString());
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Backend: HERE API error response:', safeStringify(data));
        return res.status(response.status).json({ 
          error: 'HERE API error', 
          details: data,
          url: hereUrl.toString().replace(process.env.HERE_API_KEY!, 'REDACTED')
        });
      }

      console.log('HERE API response for route received successfully');
      res.json(data);
    } catch (error) {
      console.error('Error fetching route:', error);
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  });

  app.post('/api/search', async (req, res) => {
    const { query, lat, lon } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    if (!process.env.HERE_API_KEY) {
      console.error('HERE_API_KEY is missing in environment variables');
      return res.status(500).json({ error: 'HERE API key is not configured on the server' });
    }
    try {
      const hereUrl = new URL('https://autosuggest.search.hereapi.com/v1/autosuggest');
      hereUrl.searchParams.append('q', query);
      if (lat && lon) hereUrl.searchParams.append('at', `${lat},${lon}`);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      hereUrl.searchParams.append('limit', '5');
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching search:', error);
      res.status(500).json({ error: 'Failed to fetch search' });
    }
  });

  app.post('/api/browse', async (req, res) => {
    const { lat, lon, categories, radius } = req.body;
    try {
      const hereUrl = new URL('https://browse.search.hereapi.com/v1/browse');
      hereUrl.searchParams.append('at', `${lat},${lon}`);
      
      // Use truck-specific categories if none provided
      const truckCategories = categories || '700-7600-0116,700-7600-0117,700-7600-0322,700-7900-0132,700-7000-0000';
      hereUrl.searchParams.append('categories', truckCategories);
      
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      hereUrl.searchParams.append('limit', '100');
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching browse:', error);
      res.status(500).json({ error: 'Failed to fetch browse' });
    }
  });

  app.post('/api/geocode', async (req, res) => {
    const { q } = req.body;
    try {
      const hereUrl = new URL('https://geocode.search.hereapi.com/v1/geocode');
      hereUrl.searchParams.append('q', q);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching geocode:', error);
      res.status(500).json({ error: 'Failed to fetch geocode' });
    }
  });

  app.post('/api/discover', async (req, res) => {
    const { lat, lon, q, radius } = req.body;
    try {
      const hereUrl = new URL('https://discover.search.hereapi.com/v1/discover');
      if (q) hereUrl.searchParams.append('q', q);
      // Use `in` for area restriction (replaces `at` for radius-based search)
      const r = radius || 80000;
      hereUrl.searchParams.append('in', `circle:${lat},${lon};r=${r}`);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      hereUrl.searchParams.append('limit', '50');
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching discover:', error);
      res.status(500).json({ error: 'Failed to fetch discover' });
    }
  });

  app.post('/api/lookup', async (req, res) => {
    const { id } = req.body;
    try {
      const hereUrl = new URL('https://lookup.search.hereapi.com/v1/lookup');
      hereUrl.searchParams.append('id', id);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching lookup:', error);
      res.status(500).json({ error: 'Failed to fetch lookup' });
    }
  });

  // ── HERE Fuel Prices API ──────────────────────────────────────────────────
  app.post('/api/fuel-prices', async (req, res) => {
    const { lat, lon, radius } = req.body;
    try {
      const r = radius || 50000; // Default 50km
      const hereUrl = new URL('https://fuel.hereapi.com/v3/stations');
      hereUrl.searchParams.append('in', `circle:${lat},${lon};r=${r}`);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      hereUrl.searchParams.append('limit', '100');
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      
      // Extract diesel prices (fuelType 5) and map to a simpler format
      const stations = (data.stations || []).map((s: any) => {
        const dieselPrice = s.prices?.find((p: any) => p.fuelType === '5');
        return {
          id: s.id,
          name: s.name,
          brand: s.brand || '',
          lat: s.position?.lat,
          lng: s.position?.lng,
          distance: s.distance,
          dieselPrice: dieselPrice ? parseFloat(dieselPrice.price) : null,
          currency: dieselPrice?.currency || 'USD',
          unit: dieselPrice?.unit || 'gal',
          lastUpdated: dieselPrice?.lastUpdated || s.modified,
          address: s.address?.label,
          phone: s.contacts?.phones?.[0]?.value,
          open24x7: s.open24x7,
        };
      });
      
      res.json({ total: data.total || 0, stations });
    } catch (error) {
      console.error('Error fetching fuel prices:', error);
      res.status(500).json({ error: 'Failed to fetch fuel prices' });
    }
  });


  // ── HERE Road Shield Icon Proxy (cached) ────────────────────────────────
  const shieldCache = new Map<string, Buffer>();

  app.get('/api/road-shield', async (req, res) => {
    const { label, countryCode, stateCode, routeLevel, width } = req.query;
    if (!label || !countryCode) {
      return res.status(400).json({ error: 'label and countryCode required' });
    }
    if (!process.env.HERE_API_KEY) {
      return res.status(500).json({ error: 'HERE API key not configured' });
    }

    const cacheKey = `${label}_${countryCode}_${stateCode || ''}_${routeLevel || 1}_${width || 64}`;
    if (shieldCache.has(cacheKey)) {
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(shieldCache.get(cacheKey));
    }

    try {
      const url = new URL('https://image.maps.hereapi.com/mia/v3/icons/roadShield/png');
      url.searchParams.append('label', String(label));
      url.searchParams.append('countryCode', String(countryCode));
      if (stateCode) url.searchParams.append('stateCode', String(stateCode));
      url.searchParams.append('routeLevel', String(routeLevel || 1));
      url.searchParams.append('width', String(width || 64));
      url.searchParams.append('apiKey', process.env.HERE_API_KEY!);

      const response = await fetch(url.toString());
      if (response.status === 204) {
        return res.status(204).send();
      }
      if (!response.ok) {
        console.error('HERE Shield API error:', response.status, response.statusText);
        return res.status(response.status).json({ error: 'HERE Shield API error' });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      shieldCache.set(cacheKey, buffer);

      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (err) {
      console.error('Road shield fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch road shield' });
    }
  });

  // ── HERE Traffic Flow API v7 (with shape data for polyline rendering) ─────
  app.post('/api/traffic-flow', async (req, res) => {
    const { bbox } = req.body; // [west, south, east, north] or "west,south,east,north"
    const bboxStr = Array.isArray(bbox) ? bbox.join(',') : bbox;
    if (!bboxStr) {
      return res.status(400).json({ error: 'bbox required' });
    }
    if (!process.env.HERE_API_KEY) {
      return res.status(500).json({ error: 'HERE API key not configured' });
    }
    try {
      const url = new URL('https://data.traffic.hereapi.com/v7/flow');
      url.searchParams.append('locationReferencing', 'shape');
      url.searchParams.append('in', `bbox:${bboxStr}`);
      url.searchParams.append('apiKey', process.env.HERE_API_KEY!);

      const response = await fetch(url.toString());
      if (!response.ok) {
        return res.status(response.status).json({ error: `HERE Traffic API: ${response.statusText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Traffic flow fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch traffic flow' });
    }
  });

  app.post('/api/revgeocode', async (req, res) => {
    const { lat, lon } = req.body;
    try {
      const hereUrl = new URL('https://revgeocode.search.hereapi.com/v1/revgeocode');
      hereUrl.searchParams.append('at', `${lat},${lon}`);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching revgeocode:', error);
      res.status(500).json({ error: 'Failed to fetch revgeocode' });
    }
  });

  // ─── Facility Ratings API ──────────────────────────────────────────────────

  // GET ratings for a specific POI
  app.get('/api/facility-ratings', async (req, res) => {
    const { poiId } = req.query;
    if (!poiId) return res.status(400).json({ error: 'poiId is required' });
    try {
      const store = readRatingsStore();
      const entry = store[String(poiId)];
      if (!entry) return res.json({ averageRating: 0, totalReviews: 0, ratings: [] });
      res.json({
        averageRating: entry.averageRating,
        totalReviews: entry.totalReviews,
        ratings: entry.ratings.slice(-20).reverse(),
      });
    } catch (error) {
      console.error('Error fetching ratings:', error);
      res.status(500).json({ error: 'Failed to fetch ratings' });
    }
  });

  // GET batch ratings for multiple POIs
  app.post('/api/facility-ratings-batch', async (req, res) => {
    const { poiIds } = req.body;
    if (!poiIds || !Array.isArray(poiIds)) return res.status(400).json({ error: 'poiIds array is required' });
    try {
      const store = readRatingsStore();
      const results: Record<string, { averageRating: number; totalReviews: number }> = {};
      poiIds.forEach((id: string) => {
        const entry = store[id];
        results[id] = entry
          ? { averageRating: entry.averageRating, totalReviews: entry.totalReviews }
          : { averageRating: 0, totalReviews: 0 };
      });
      res.json(results);
    } catch (error) {
      console.error('Error fetching batch ratings:', error);
      res.status(500).json({ error: 'Failed to fetch batch ratings' });
    }
  });

  // POST a new rating/review for a POI
  app.post('/api/facility-ratings', async (req, res) => {
    const { poiId, rating, review, tags, userName, name, lat, lon } = req.body;
    if (!poiId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'poiId and rating (1-5) are required' });
    }
    try {
      const store = readRatingsStore();
      if (!store[poiId]) {
        store[poiId] = {
          poiId,
          name: name || 'Unknown',
          lat: lat || 0,
          lon: lon || 0,
          ratings: [],
          averageRating: 0,
          totalReviews: 0,
        };
      }
      store[poiId].ratings.push({
        rating: Math.round(rating),
        review: review || undefined,
        tags: tags || undefined,
        userName: userName || 'Driver',
        createdAt: new Date().toISOString(),
      });
      const allRatings = store[poiId].ratings;
      store[poiId].averageRating = Math.round((allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length) * 10) / 10;
      store[poiId].totalReviews = allRatings.length;
      if (name) store[poiId].name = name;
      
      writeRatingsStore(store);
      res.json({
        success: true,
        averageRating: store[poiId].averageRating,
        totalReviews: store[poiId].totalReviews,
      });
    } catch (error) {
      console.error('Error saving rating:', error);
      res.status(500).json({ error: 'Failed to save rating' });
    }
  });
  // ────────────────────────────────────────────────────────────────────────────

  app.post('/api/traffic-incidents', async (req, res) => {
    const { bbox } = req.body;
    try {
      const hereUrl = new URL('https://data.traffic.hereapi.com/v7/incidents');
      hereUrl.searchParams.append('in', `bbox:${bbox}`);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching traffic incidents:', error);
      res.status(500).json({ error: 'Failed to fetch traffic incidents' });
    }
  });

  // GET parking status for a specific POI (identified by lat/lon)
  app.get('/api/poi/parking-status', async (req, res) => {
    const { poiId } = req.query;
    if (!poiId) return res.status(400).json({ error: 'poiId is required' });
    try {
      const store = readParkingStore();
      const entry = store[String(poiId)];
      if (!entry) return res.json({ status: null, updatedAt: null, updateCount: 0, reputation_score: 0 });
      // Calculate truck stop reputation from parking data
      const statusScores: Record<string, number> = { light: 4.5, medium: 3.2, heavy: 2.0, maxed: 1.0 };
      const reputation_score = entry.status ? Math.round((statusScores[entry.status] || 0) * 10) / 10 : 0;
      res.json({ ...entry, reputation_score });
    } catch (error) {
      console.error('Error fetching parking status:', error);
      res.status(500).json({ error: 'Failed to fetch parking status' });
    }
  });

  // POST — user submits a parking status update
  app.post('/api/poi/parking-status', async (req, res) => {
    const { poiId, status, name, lat, lon } = req.body;
    if (!poiId || !status) return res.status(400).json({ error: 'poiId and status are required' });
    const valid = ['light', 'medium', 'heavy', 'maxed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status value' });
    try {
      const store = readParkingStore();
      const updateCount = (store[String(poiId)]?.updateCount || 0) + 1;
      store[String(poiId)] = {
        status,
        name: name || 'Unknown',
        lat: lat || 0,
        lon: lon || 0,
        updatedAt: new Date().toISOString(),
        updateCount
      };
      writeParkingStore(store);
      res.json({ success: true, status, updateCount });
    } catch (error) {
      console.error('Error saving parking status:', error);
      res.status(500).json({ error: 'Failed to save parking status' });
    }
  });

  // GET parking predictions — time-of-day based availability forecast
  app.get('/api/poi/parking-predict', async (req, res) => {
    const { poiId, hour } = req.query;
    if (!poiId) return res.status(400).json({ error: 'poiId is required' });
    try {
      const store = readParkingStore();
      const entry = store[String(poiId)];
      const currentHour = hour ? parseInt(String(hour), 10) : new Date().getHours();

      // Historical patterns: truck stops fill up at predictable times
      // Peak hours: 7-9 PM (drivers hitting HOS limits), Low: 6-10 AM (departures)
      const baseFill: Record<string, number> = {
        light: 0.3, medium: 0.55, heavy: 0.78, maxed: 0.95
      };
      const hourFactor = [
        0.55, 0.50, 0.45, 0.42, 0.40, 0.38, // 0-5 AM: emptying
        0.35, 0.32, 0.30, 0.33, 0.38, 0.42,  // 6-11 AM: low
        0.48, 0.52, 0.55, 0.60, 0.68, 0.75,  // 12-5 PM: filling
        0.82, 0.90, 0.93, 0.88, 0.78, 0.65   // 6-11 PM: peak then decline
      ];
      const factor = hourFactor[Math.min(23, Math.max(0, currentHour))];
      const lastStatus = entry?.status || 'medium';
      const basePct = baseFill[lastStatus] || 0.5;
      // Blend historical pattern with last known status
      const predicted = Math.round((basePct * 0.4 + factor * 0.6) * 100);

      let prediction: string;
      if (predicted < 40) prediction = 'LIKELY OPEN';
      else if (predicted < 65) prediction = 'FILLING UP';
      else if (predicted < 85) prediction = 'FULL SOON';
      else prediction = 'LIKELY FULL';

      // Generate next 6 hours forecast
      const forecast = Array.from({ length: 6 }, (_, i) => {
        const h = (currentHour + i + 1) % 24;
        const f = hourFactor[h];
        const p = Math.round((basePct * 0.4 + f * 0.6) * 100);
        return { hour: h, fillPercent: p, label: p < 40 ? 'OPEN' : p < 65 ? 'FILLING' : p < 85 ? 'FULL SOON' : 'FULL' };
      });

      res.json({
        poiId: String(poiId),
        currentHour,
        fillPercent: predicted,
        prediction,
        forecast,
        lastKnownStatus: lastStatus,
        updatedAt: entry?.updatedAt || null
      });
    } catch (error) {
      console.error('Error computing parking prediction:', error);
      res.status(500).json({ error: 'Failed to compute parking prediction' });
    }
  });

  // ─── Community Reports ──────────────────────────────────────────────────────
  const COMMUNITY_FILE = path.join(__dirname, 'data', 'community_reports.json');

  function readCommunityStore(): any[] {
    try {
      if (!existsSync(COMMUNITY_FILE)) return [];
      return JSON.parse(readFileSync(COMMUNITY_FILE, 'utf8'));
    } catch { return []; }
  }

  function writeCommunityStore(reports: any[]) {
    try { writeFileSync(COMMUNITY_FILE, JSON.stringify(reports, null, 2), 'utf8'); }
    catch (e) { console.error('Failed to write community store:', e); }
  }

  app.get('/api/community/reports', (req, res) => {
    try {
      let reports = readCommunityStore();
      // Remove expired hazard/weigh station reports (4 hour TTL)
      const now = Date.now();
      reports = reports.filter((r: any) => {
        if (r.expiresAt && new Date(r.expiresAt).getTime() < now) return false;
        return true;
      });
      writeCommunityStore(reports);
      res.json({ reports });
    } catch (error) {
      console.error('Error loading community reports:', error);
      res.status(500).json({ error: 'Failed to load reports' });
    }
  });

  app.post('/api/community/reports', (req, res) => {
    const { category, title, description, lat, lon, locationName, userName, meta } = req.body;
    if (!category || !title) return res.status(400).json({ error: 'category and title are required' });
    try {
      const reports = readCommunityStore();
      const ttlHours = (category === 'hazard' || category === 'weigh_station') ? 4 : 24;
      const newReport = {
        id: `cr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        category,
        title,
        description: description || '',
        lat: lat || 0,
        lon: lon || 0,
        locationName: locationName || 'Unknown',
        userName: userName || 'Anonymous Trucker',
        upvotes: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlHours * 3600000).toISOString(),
        meta: meta || {},
      };
      reports.push(newReport);
      writeCommunityStore(reports);
      res.json(newReport);
    } catch (error) {
      console.error('Error saving community report:', error);
      res.status(500).json({ error: 'Failed to save report' });
    }
  });

  app.post('/api/community/reports/:id/upvote', (req, res) => {
    const { id } = req.params;
    try {
      const reports = readCommunityStore();
      const report = reports.find((r: any) => r.id === id);
      if (!report) return res.status(404).json({ error: 'Report not found' });
      report.upvotes = (report.upvotes || 0) + 1;
      writeCommunityStore(reports);
      res.json({ upvotes: report.upvotes });
    } catch (error) {
      console.error('Error upvoting:', error);
      res.status(500).json({ error: 'Failed to upvote' });
    }
  });
  // ────────────────────────────────────────────────────────────────────────────

  // ─── AI Crash / Incident Prediction ─────────────────────────────────────────
  app.post('/api/crash-prediction', async (req, res) => {
    const { routeCoords, bbox } = req.body;
    if (!routeCoords && !bbox) return res.status(400).json({ error: 'routeCoords or bbox required' });

    try {
      // Step 1: Fetch real traffic incidents from HERE
      const hereBbox = bbox || (() => {
        const lats = routeCoords.map((c: number[]) => c[0]);
        const lons = routeCoords.map((c: number[]) => c[1]);
        return `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`;
      })();

      const hereUrl = new URL('https://data.traffic.hereapi.com/v7/incidents');
      hereUrl.searchParams.append('in', `bbox:${hereBbox}`);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);

      const hereResp = await fetch(hereUrl.toString());
      const hereData = await hereResp.json();
      const incidents = hereData.results || [];

      // Step 2: Use Gemini to analyze and predict crash risk
      const GEMINI_KEY = process.env.GEMINI_API_KEY;
      let aiAnalysis = null;

      if (GEMINI_KEY && incidents.length > 0) {
        const incidentSummary = incidents.slice(0, 15).map((inc: any) => {
          const desc = inc.incidentDetails?.description?.value || 'Unknown incident';
          const type = inc.incidentDetails?.type || 'UNKNOWN';
          const severity = inc.incidentDetails?.severity || 'UNKNOWN';
          const startTime = inc.incidentDetails?.startTime || '';
          const loc = inc.location?.description?.value || '';
          return `- [${type}] ${desc} (Severity: ${severity}, Location: ${loc}, Started: ${startTime})`;
        }).join('\n');

        const prompt = `You are an AI crash detection system for commercial truck drivers. Analyze these real-time traffic incidents along a truck route and provide:
1. A risk score (1-10, where 10 is extremely dangerous)
2. Top 3 specific warnings for the truck driver (max 50 words each)
3. A recommended action (PROCEED WITH CAUTION / CONSIDER ALTERNATE ROUTE / STOP AND WAIT)
4. Estimated delay in minutes

Current incidents on route:
${incidentSummary}

Respond in valid JSON format ONLY:
{"riskScore": number, "warnings": ["string","string","string"], "recommendation": "string", "estimatedDelay": number, "summary": "one sentence summary"}`;

        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
          const geminiResp = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
            }),
          });
          const geminiData = await geminiResp.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          // Extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Gemini analysis error:', e);
        }
      }

      // Step 3: Build response with incidents + AI analysis
      const response: any = {
        incidentCount: incidents.length,
        incidents: incidents.slice(0, 20).map((inc: any) => ({
          id: inc.incidentDetails?.id || Math.random().toString(36),
          type: inc.incidentDetails?.type || 'UNKNOWN',
          description: inc.incidentDetails?.description?.value || 'Traffic incident',
          severity: inc.incidentDetails?.severity || 'UNKNOWN',
          startTime: inc.incidentDetails?.startTime || null,
          endTime: inc.incidentDetails?.endTime || null,
          location: inc.location?.description?.value || 'Along route',
          lat: inc.location?.geolocation?.latitude || null,
          lon: inc.location?.geolocation?.longitude || null,
        })),
        aiPrediction: aiAnalysis || {
          riskScore: incidents.length === 0 ? 1 : Math.min(10, Math.ceil(incidents.length * 1.5)),
          warnings: incidents.length === 0
            ? ['No incidents detected on your route']
            : [`${incidents.length} incident(s) detected along your route`, 'Monitor traffic ahead', 'Maintain safe following distance'],
          recommendation: incidents.length === 0 ? 'PROCEED WITH CAUTION' : incidents.length > 5 ? 'CONSIDER ALTERNATE ROUTE' : 'PROCEED WITH CAUTION',
          estimatedDelay: incidents.length * 5,
          summary: incidents.length === 0 ? 'Route is clear — no incidents detected.' : `${incidents.length} traffic incident(s) detected along your route.`
        },
        analyzedAt: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error in crash prediction:', error);
      res.status(500).json({ error: 'Failed to analyze route incidents' });
    }
  });
  // ────────────────────────────────────────────────────────────────────────────

  app.post('/api/waypoint-sequence', async (req, res) => {
    const { start, end, destination } = req.body; // destination is an array of waypoints
    try {
      const hereUrl = new URL('https://wps.hereapi.com/v8/findsequence2');
      hereUrl.searchParams.append('start', start);
      if (end) hereUrl.searchParams.append('end', end);
      destination.forEach((dest: string, idx: number) => {
        hereUrl.searchParams.append(`destination${idx+1}`, dest);
      });
      hereUrl.searchParams.append('mode', 'fastest;truck');
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching waypoint sequence:', error);
      res.status(500).json({ error: 'Failed to fetch waypoint sequence' });
    }
  });

// ─── File-based facility store ──────────────────────────────────────────────
const FACILITIES_FILE = path.join(__dirname, 'data', 'facilities.json');
const GOOGLE_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY;
const FACILITY_CACHE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readFacilityStore(): Record<string, any> {
  try {
    if (!existsSync(FACILITIES_FILE)) return { _grid_cache: {} };
    return JSON.parse(readFileSync(FACILITIES_FILE, 'utf8'));
  } catch { return { _grid_cache: {} }; }
}
function writeFacilityStore(data: Record<string, any>) {
  try { writeFileSync(FACILITIES_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error('Failed to write facility store:', e); }
}

function getMajorityVote(votes: Record<string, number>): string | null {
  const entries = Object.entries(votes).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function calcWeightedScore(votes: Record<string, number>, weights: Record<string, number>): number {
  let total = 0, weighted = 0;
  for (const [k, v] of Object.entries(votes)) {
    if (v > 0 && weights[k] !== undefined) { total += v; weighted += v * weights[k]; }
  }
  return total > 0 ? weighted / total : 0;
}

function calcFacilityReputationScore(crowd: any): number {
  if (!crowd || (crowd.total_reports || 0) === 0) return 0;
  const scores: number[] = [];

  const loadTotal = (crowd.loading_speed?.fast || 0) + (crowd.loading_speed?.average || 0) + (crowd.loading_speed?.slow || 0);
  if (loadTotal > 0) scores.push(calcWeightedScore(crowd.loading_speed, { fast: 5, average: 3, slow: 1 }));

  const unloadTotal = (crowd.unloading_speed?.fast || 0) + (crowd.unloading_speed?.average || 0) + (crowd.unloading_speed?.slow || 0);
  if (unloadTotal > 0) scores.push(calcWeightedScore(crowd.unloading_speed, { fast: 5, average: 3, slow: 1 }));

  const parkTotal = (crowd.parking_allowed?.yes || 0) + (crowd.parking_allowed?.no || 0);
  if (parkTotal > 0) scores.push((crowd.parking_allowed.yes / parkTotal) * 5);

  const overnightTotal = (crowd.overnight_parking?.yes || 0) + (crowd.overnight_parking?.no || 0);
  if (overnightTotal > 0) scores.push((crowd.overnight_parking.yes / overnightTotal) * 5);

  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(Math.max(0, Math.min(5, avg)) * 10) / 10;
}

function buildMajority(crowd: any) {
  return {
    type:               getMajorityVote(crowd.type_votes || {}) || 'both',
    loading_speed:      getMajorityVote(crowd.loading_speed || {}),
    unloading_speed:    getMajorityVote(crowd.unloading_speed || {}),
    parking_allowed:    getMajorityVote(crowd.parking_allowed || {}),
    overnight_parking:  getMajorityVote(crowd.overnight_parking || {}),
    open_days: (Object.entries(crowd.open_days || {}) as [string, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([d]) => d),
    open_time:  getMajorityVote(crowd.open_time || {}),
    close_time: getMajorityVote(crowd.close_time || {}),
    reputation_score: calcFacilityReputationScore(crowd),
    total_reports: crowd.total_reports || 0,
  };
}

function gridKey(lat: number, lon: number): string {
  return `${Math.round(lat * 2) / 2}_${Math.round(lon * 2) / 2}`;
}

const FACILITY_KEYWORDS = ['warehouse', 'distribution center', 'fulfillment center', 'truck terminal', 'freight terminal'];

async function seedFacilitiesFromGoogle(lat: number, lon: number, gk: string): Promise<void> {
  if (!GOOGLE_KEY) return;
  const store = readFacilityStore();
  store._grid_cache = store._grid_cache || {};
  store._grid_cache[gk] = new Date().toISOString(); // mark as fetched

  for (const kw of FACILITY_KEYWORDS) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=50000&keyword=${encodeURIComponent(kw)}&key=${GOOGLE_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json() as any;
      if (!['OK','ZERO_RESULTS'].includes(data.status)) continue;

      for (const p of (data.results || [])) {
        const id = String(p.place_id);
        if (!id || store[id]) continue; // skip if already exists
        store[id] = {
          id, source: 'google',
          name: p.name || 'Unknown Facility',
          lat: p.geometry?.location?.lat || lat,
          lon: p.geometry?.location?.lng || lon,
          address: p.vicinity || '',
          phone: '',
          rating: p.rating,
          google_hours: [],
          hours_fetched: false,
          last_fetched: new Date().toISOString(),
          crowd_data: {
            type_votes:        { shipper: 0, receiver: 0, both: 0 },
            loading_speed:     { fast: 0, average: 0, slow: 0 },
            unloading_speed:   { fast: 0, average: 0, slow: 0 },
            parking_allowed:   { yes: 0, no: 0 },
            overnight_parking: { yes: 0, no: 0 },
            open_days:         { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
            open_time:         {},
            close_time:        {},
            total_reports: 0,
            last_updated: new Date().toISOString(),
          },
        };
      }
      await new Promise(r => setTimeout(r, 150)); // gentle rate limit
    } catch (e) { console.error('Google Places seed error:', e); }
  }
  writeFacilityStore(store);
}

// ─── Facility API Routes ─────────────────────────────────────────────────────

  app.get('/api/facilities', async (req, res) => {
    const lat = parseFloat(String(req.query.lat));
    const lon = parseFloat(String(req.query.lon));
    const radius = parseFloat(String(req.query.radius || '80000'));
    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat/lon required' });

    const gk = gridKey(lat, lon);
    const store = readFacilityStore();
    const cachedAt = store._grid_cache?.[gk];
    const stale = !cachedAt || (Date.now() - new Date(cachedAt).getTime() > FACILITY_CACHE_MS);

    if (stale) {
      // Kick off background seed — don't block the response
      seedFacilitiesFromGoogle(lat, lon, gk).catch(console.error);
    }

    // Haversine filter
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const result = Object.values(store)
      .filter((f: any) => f && f.id && typeof f.lat === 'number')
      .filter((f: any) => {
        const dlat = toRad(f.lat - lat);
        const dlon = toRad(f.lon - lon);
        const a = Math.sin(dlat/2)**2 + Math.cos(toRad(lat)) * Math.cos(toRad(f.lat)) * Math.sin(dlon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= radius;
      })
      .map((f: any) => ({ ...f, majority: buildMajority(f.crowd_data) }));

    res.json({ facilities: result, seeding: stale });
  });

  app.post('/api/facilities', async (req, res) => {
    const { name, lat, lon, address, type } = req.body;
    if (!name || !lat || !lon) return res.status(400).json({ error: 'name/lat/lon required' });
    const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const store = readFacilityStore();
    store[id] = {
      id, source: 'manual', name, lat, lon,
      address: address || '', phone: '', google_hours: [], hours_fetched: false,
      last_fetched: new Date().toISOString(),
      crowd_data: {
        type_votes:        { shipper: type === 'shipper' ? 1 : 0, receiver: type === 'receiver' ? 1 : 0, both: type === 'both' ? 1 : 0 },
        loading_speed:     { fast: 0, average: 0, slow: 0 },
        unloading_speed:   { fast: 0, average: 0, slow: 0 },
        parking_allowed:   { yes: 0, no: 0 },
        overnight_parking: { yes: 0, no: 0 },
        open_days:         { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
        open_time: {}, close_time: {},
        total_reports: 1, last_updated: new Date().toISOString(),
      },
    };
    writeFacilityStore(store);
    res.json({ success: true, facility: { ...store[id], majority: buildMajority(store[id].crowd_data) } });
  });

  app.get('/api/facilities/:id/hours', async (req, res) => {
    const { id } = req.params;
    const store = readFacilityStore();
    const fac = store[id];
    if (!fac) return res.status(404).json({ error: 'Not found' });
    if (fac.hours_fetched || fac.source === 'manual') return res.json({ google_hours: fac.google_hours || [] });

    if (!GOOGLE_KEY) return res.json({ google_hours: [] });
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=opening_hours,formatted_phone_number&key=${GOOGLE_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json() as any;
      const hours = data.result?.opening_hours?.weekday_text || [];
      const phone = data.result?.formatted_phone_number || fac.phone || '';
      store[id].google_hours = hours;
      store[id].phone = phone;
      store[id].hours_fetched = true;
      writeFacilityStore(store);
      res.json({ google_hours: hours, phone });
    } catch (e) { res.json({ google_hours: [] }); }
  });

  app.post('/api/facilities/report', async (req, res) => {
    const { facility_id, type, loading_speed, unloading_speed, parking_allowed, overnight_parking, open_days, open_time, close_time } = req.body;
    if (!facility_id) return res.status(400).json({ error: 'facility_id required' });
    const store = readFacilityStore();
    const fac = store[String(facility_id)];
    if (!fac) return res.status(404).json({ error: 'Facility not found' });

    const cd = fac.crowd_data;
    if (type && ['shipper','receiver','both'].includes(type)) cd.type_votes[type] = (cd.type_votes[type] || 0) + 1;
    if (loading_speed && ['fast','average','slow'].includes(loading_speed)) cd.loading_speed[loading_speed] = (cd.loading_speed[loading_speed] || 0) + 1;
    if (unloading_speed && ['fast','average','slow'].includes(unloading_speed)) cd.unloading_speed[unloading_speed] = (cd.unloading_speed[unloading_speed] || 0) + 1;
    if (parking_allowed !== undefined) cd.parking_allowed[parking_allowed ? 'yes' : 'no'] = (cd.parking_allowed[parking_allowed ? 'yes' : 'no'] || 0) + 1;
    if (overnight_parking !== undefined) cd.overnight_parking[overnight_parking ? 'yes' : 'no'] = (cd.overnight_parking[overnight_parking ? 'yes' : 'no'] || 0) + 1;
    if (Array.isArray(open_days)) open_days.forEach((d: string) => { if (cd.open_days[d] !== undefined) cd.open_days[d]++; });
    if (open_time) cd.open_time[open_time] = (cd.open_time[open_time] || 0) + 1;
    if (close_time) cd.close_time[close_time] = (cd.close_time[close_time] || 0) + 1;
    cd.total_reports = (cd.total_reports || 0) + 1;
    cd.last_updated = new Date().toISOString();

    writeFacilityStore(store);
    res.json({ success: true, majority: buildMajority(cd), total_reports: cd.total_reports });
  });

  // ────────────────────────────────────────────────────────────────────────────

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24679 } },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT || '8001', 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}...`);
  });
}

createServer();
