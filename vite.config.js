import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Web offline-first: el service worker guarda la app (HTML, JS, CSS, íconos) para que
    // abra sin internet. Los datos NO pasan por aquí: viven en IndexedDB, separados por cuenta.
    // En la app Android (Capacitor) no se registra: los archivos ya vienen dentro del APK.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'AgroSentinel',
        short_name: 'AgroSentinel',
        description: 'Mantenimiento agrícola: órdenes de trabajo, inventario y mantenimiento predictivo, también sin conexión.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0f2e22',
        background_color: '#0f2e22',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // logo.png original (1 MB) no se precachea: la app usa la versión empaquetada en assets/.
        // Íconos y manifest los agrega el plugin (includeAssets y manifest.icons).
        globPatterns: ['**/*.{js,css,html,svg}', 'assets/*.png'],
        globIgnores: ['logo.png'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Cualquier ruta de la SPA abre index.html aunque no haya red.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fotos de los activos (públicas): se ven sin conexión una vez cargadas.
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/asset-images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'asset-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
})
