import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.HERE_API_KEY': JSON.stringify(env.HERE_API_KEY || ''),
        'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ''),
        'process.env.MAPTILER_API_KEY': JSON.stringify(env.MAPTILER_API_KEY || ''),
        'process.env.REACT_APP_MAPBOX_TOKEN': JSON.stringify(env.REACT_APP_MAPBOX_TOKEN || env.MAPBOX_ACCESS_TOKEN || ''),
        'import.meta.env.REACT_APP_MAPBOX_TOKEN': JSON.stringify(env.REACT_APP_MAPBOX_TOKEN || env.MAPBOX_ACCESS_TOKEN || ''),
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ["poi-integration-dev.preview.emergentagent.com", "trucker-nav-by-tue.preview.emergentagent.com"],
      },
      plugins: [
        tailwindcss(),
        react(),
        // VitePWA({
        //   registerType: 'autoUpdate',
        //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        //   manifest: {
        //     name: 'Trucker Navigation',
        //     short_name: 'TruckNav',
        //     description: 'Enterprise-grade trucking GPS and navigation',
        //     theme_color: '#050505',
        //     background_color: '#050505',
        //     display: 'standalone',
        //     icons: [
        //       {
        //         src: 'pwa-192x192.png',
        //         sizes: '192x192',
        //         type: 'image/png'
        //       },
        //       {
        //         src: 'pwa-512x512.png',
        //         sizes: '512x512',
        //         type: 'image/png'
        //       }
        //     ]
        //   },
        //   workbox: {
        //     maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        //     runtimeCaching: [
        //       {
        //         urlPattern: /^https:\/\/.*\.hereapi\.com\/.*/i,
        //         handler: 'CacheFirst',
        //         options: {
        //           cacheName: 'here-maps-cache',
        //           expiration: {
        //             maxEntries: 500,
        //             maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        //           },
        //           cacheableResponse: {
        //             statuses: [0, 200]
        //           }
        //         }
        //       },
        //       {
        //         urlPattern: /^https:\/\/router\.hereapi\.com\/.*/i,
        //         handler: 'NetworkFirst',
        //         options: {
        //           cacheName: 'here-routing-cache',
        //           expiration: {
        //             maxEntries: 50,
        //             maxAgeSeconds: 60 * 60 * 24 // 1 day
        //           },
        //           cacheableResponse: {
        //             statuses: [0, 200]
        //           }
        //         }
        //       }
        //     ]
        //   }
        // })
      ],
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      }
    };
});
