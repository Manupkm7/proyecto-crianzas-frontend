import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,

      // host: true → escucha en 0.0.0.0 (obligatorio cuando Vite corre dentro de Docker,
      // para que el contenedor nginx pueda alcanzarlo como http://frontend:5173).
      // En dev local sin Docker también funciona, solo que queda expuesto en la red local.
      host: true,

      // HMR (Hot Module Replacement): actualización en vivo sin recargar el navegador.
      // Cuando se accede desde afuera vía Cloudflare Tunnel, el WebSocket de HMR
      // necesita saber el dominio público. Se configura via VITE_HMR_HOST en el .env.
      // Si no está definido (dev local directo), usa el comportamiento por defecto.
      hmr: env.VITE_HMR_HOST
        ? {
            host: env.VITE_HMR_HOST,
            clientPort: 443,   // Cloudflare siempre termina en HTTPS/443
            protocol: 'wss',
          }
        : true,

      // Proxy solo activo cuando Vite corre directamente en el host (sin Docker/nginx).
      // Cuando corre en Docker, nginx hace este trabajo — pero el proxy no interfiere.
      proxy: {
        '/api': {
          target: 'http://localhost',
          changeOrigin: true,
        },
      },
    },
  }
})
