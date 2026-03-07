import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  },
  base: './',
  server: {
    proxy: {
      '/api/ch': {
        target: 'https://chapi.cloudhealthtech.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ch/, '')
      }
    }
  }
})
