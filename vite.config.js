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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
      },
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
            if (id.includes('/firebase/') || id.includes('\\firebase\\')) {
              return 'vendor-firebase';
            }
            if (id.includes('/recharts/') || id.includes('\\recharts\\')) {
              return 'vendor-charts';
            }
            if (id.includes('/framer-motion/') || id.includes('\\framer-motion\\')) {
              return 'vendor-framer';
            }
            if (id.includes('/pdfjs-dist/') || id.includes('\\pdfjs-dist\\')) {
              return 'vendor-pdf';
            }
            if (id.includes('/lucide-react/') || id.includes('\\lucide-react\\')) {
              return 'vendor-icons';
            }
            if (
              id.includes('/react/') || id.includes('\\react\\') ||
              id.includes('/react-dom/') || id.includes('\\react-dom\\') ||
              id.includes('/react-router/') || id.includes('\\react-router\\') ||
              id.includes('/react-router-dom/') || id.includes('\\react-router-dom\\')
            ) {
              return 'vendor-react';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})