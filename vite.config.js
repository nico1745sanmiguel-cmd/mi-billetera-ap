import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  root: fs.realpathSync.native(path.resolve('./')),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'icon.webp', 'icon-192.webp', 'logos/**/*'],
      manifest: {
        short_name: "Mi Billetera",
        name: "Mi Billetera - Control de Gastos",
        description: "Mi Billetera - Aplicación personal para control de gastos, finanzas y presupuestos.",
        lang: "es",
        categories: ["finance"],
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#f3f4f6",
        icons: [
          {
            src: "/icon-192.webp",
            sizes: "192x192",
            type: "image/webp",
            purpose: "any maskable"
          },
          {
            src: "/icon.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any maskable"
          },
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/(?:dolarapi\.com|api\.coingecko\.com|data912\.com)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'market-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/node_modules/firebase/firestore') || normalizedId.includes('/node_modules/@firebase/firestore')) {
              return 'firebase-firestore';
            }
            if (normalizedId.includes('/node_modules/firebase/auth') || normalizedId.includes('/node_modules/@firebase/auth')) {
              return 'firebase-auth';
            }
            if (normalizedId.includes('/node_modules/firebase/') || normalizedId.includes('/node_modules/@firebase/')) {
              return 'firebase-core';
            }
            if (normalizedId.includes('/node_modules/framer-motion/')) {
              return 'framer-motion';
            }
            if (normalizedId.includes('/node_modules/pdfjs-dist/')) {
              return 'pdfjs-dist';
            }
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router/') ||
              normalizedId.includes('/node_modules/react-router-dom/')
            ) {
              return 'vendor';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})