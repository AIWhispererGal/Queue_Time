import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Temporarily disable HTTPS for Zoom testing
    // https: {
    //   key: fs.readFileSync('./cert.key'),
    //   cert: fs.readFileSync('./cert.crt'),
    // },
    port: 5173,
    hmr: {
      clientPort: 443
    },
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', 'localhost', 'queuetime.local'],
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self' https://*.zoom.us https://*.zoomgov.com wss://*.zoom.us wss://*.zoomgov.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.zoom.us; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN'
    }
  }
})
