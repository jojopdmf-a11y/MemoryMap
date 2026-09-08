import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { memoryMapAuthPlugin } from './vite.auth.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), memoryMapAuthPlugin()],
  server: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
})
