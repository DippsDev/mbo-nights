import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (same origin, hashed, cached) — replaces Google Fonts.
// Only the subsets a page actually renders are downloaded (unicode-range).
import '@fontsource-variable/oswald/wght.css'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import './index.css'
import './lib/motion'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
