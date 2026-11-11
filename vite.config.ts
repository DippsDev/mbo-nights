import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Fonts are only discovered after the CSS downloads; preloading the three
// latin files the first screen uses removes that extra round trip.
const FIRST_SCREEN_FONTS = /^assets\/(oswald-latin-wght-normal|manrope-latin-wght-normal|instrument-serif-latin-400-italic)-[\w-]+\.woff2$/

function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      return Object.keys(ctx.bundle ?? {})
        .filter((f) => FIRST_SCREEN_FONTS.test(f))
        .map((f) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${f}`, crossorigin: '' },
          injectTo: 'head' as const,
        }))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadFonts()],
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
