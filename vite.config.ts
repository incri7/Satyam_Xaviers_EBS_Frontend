import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Only parse as URL when it's absolute (dev). In Docker, VITE_API_BASE_URL=/api/ (relative) and the
  // dev-server proxy isn't used — nginx handles routing.
  const apiBaseUrl = env.VITE_API_BASE_URL ?? '';
  const target = apiBaseUrl.startsWith('http') ? new URL(apiBaseUrl).origin : 'http://localhost:8002';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: "Satyam Xavier's EBS",
          short_name: 'SX EBS',
          description: 'School management system for Satyam Xavier\'s Higher Secondary School',
          theme_color: '#E5243B',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/dashboard',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
        },
      },
      historyApiFallback: true,
    },
  }
})
