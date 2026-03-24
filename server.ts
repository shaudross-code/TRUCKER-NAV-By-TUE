import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { safeStringify } from './utils';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT is not set. Firebase Admin is not initialized.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

async function createServer() {
  const app = express();
  app.use(express.json());

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
      
      const hereUrl = new URL('https://router.hereapi.com/v8/routes');
      hereUrl.searchParams.append('transportMode', 'truck');
      hereUrl.searchParams.append('origin', origin);
      
      if (via && Array.isArray(via)) {
        via.forEach((wp: string) => {
          hereUrl.searchParams.append('via', wp);
        });
      }
      
      hereUrl.searchParams.append('destination', destination);
      hereUrl.searchParams.append('return', 'summary,actions,instructions,incidents,polyline,turnByTurnActions');
      hereUrl.searchParams.append('spans', 'length,truckAttributes,incidents,speedLimit,streetAttributes');
      hereUrl.searchParams.append('vehicle[height]', heightCm.toString());
      hereUrl.searchParams.append('vehicle[grossWeight]', weightKg.toString());
      hereUrl.searchParams.append('vehicle[length]', lengthCm.toString());
      hereUrl.searchParams.append('vehicle[width]', widthCm.toString());
      hereUrl.searchParams.append('vehicle[axleCount]', axleCount.toString());
      hereUrl.searchParams.append('vehicle[weightPerAxle]', axleWeightKg.toString());
      hereUrl.searchParams.append('vehicle[trailerCount]', trailerCount.toString());
      
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
    const { lat, lon, categories } = req.body;
    try {
      const hereUrl = new URL('https://browse.search.hereapi.com/v1/browse');
      hereUrl.searchParams.append('at', `${lat},${lon}`);
      
      // Use truck-specific categories if none provided
      const truckCategories = categories || '700-7600-0116,700-7600-0117,700-7600-0322,700-7000-0000';
      hereUrl.searchParams.append('categories', truckCategories);
      
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      hereUrl.searchParams.append('limit', '50'); // Increased for better coverage
      
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
    const { lat, lon, q } = req.body;
    try {
      const hereUrl = new URL('https://discover.search.hereapi.com/v1/discover');
      hereUrl.searchParams.append('at', `${lat},${lon}`);
      if (q) hereUrl.searchParams.append('q', q);
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      hereUrl.searchParams.append('limit', '20');
      
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

  app.post('/api/traffic-flow', async (req, res) => {
    const { bbox } = req.body; // e.g. "minLat,minLon,maxLat,maxLon"
    try {
      const hereUrl = new URL('https://data.traffic.hereapi.com/v7/flow');
      hereUrl.searchParams.append('in', `bbox:${bbox}`);
      hereUrl.searchParams.append('locationReferencing', 'olr');
      hereUrl.searchParams.append('apiKey', process.env.HERE_API_KEY!);
      
      const response = await fetch(hereUrl.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching traffic flow:', error);
      res.status(500).json({ error: 'Failed to fetch traffic flow' });
    }
  });

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

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server is listening on port 3000...');
  });
}

createServer();
