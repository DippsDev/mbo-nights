import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        // Libraries change far less often than app code. Separate chunks mean a
        // redeploy only invalidates the small app chunk; returning visitors keep
        // React / GSAP cached.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
            { name: 'router', test: /node_modules[\/](react-router|react-router-dom)[\/]/ },
            { name: 'gsap', test: /node_modules[\/]gsap[\/]/ },
          ],
        },
      },
    },
  },
})
