import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El frontend corre en localhost:5173 (Vite dev server).
// El backend corre en localhost:80 (Docker Sail).
// El proxy redirige /api/* al backend para evitar problemas de CORS en desarrollo.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
})
