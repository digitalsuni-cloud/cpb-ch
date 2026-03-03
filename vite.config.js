import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
