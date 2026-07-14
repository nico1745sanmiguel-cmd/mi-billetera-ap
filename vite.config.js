import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png', 'icon.webp', 'icon-192.webp', 'logos/**/*'],
      manifest: {
        short_name: "Mi Billetera",
        name: "Control de Gastos",
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
        ],
        start_url: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#f3f4f6"
      }
    })
  ],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})