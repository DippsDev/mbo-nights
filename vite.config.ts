import fs from 'node:fs/promises'
import path from 'node:path'
import { createServer, defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite'
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

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Link-preview bots (WhatsApp, Facebook, X) read the raw HTML and never run
 * JavaScript, so after the build this writes dist/<route>.html for every public
 * page with its own title, description, canonical and structured data baked in.
 * Vercel serves /events/night-01 from dist/events/night-01.html (cleanUrls).
 * Also generates sitemap.xml from the same route list, so it never goes stale.
 */
function prerenderMeta(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'prerender-meta',
    apply: 'build',
    configResolved(c) {
      config = c
    },
    async closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir)
      const template = await fs.readFile(path.join(outDir, 'index.html'), 'utf8')
      const env = loadEnv(config.mode, config.root, 'VITE_')
      const ticketsLive = env.VITE_TICKETS_LIVE === 'true'

      // Load the TypeScript meta module through Vite so it resolves like app code.
      const server = await createServer({
        root: config.root,
        configFile: false,
        logLevel: 'silent',
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'custom',
      })
      try {
        const seo = (await server.ssrLoadModule('/src/lib/seoMeta.ts')) as {
          prerenderRoutes: () => string[]
          canonical: (route: string) => string
          metaFor: (
            route: string,
            ticketsLive: boolean,
          ) => { title: string; description: string; noindex?: boolean; jsonLd?: object }
        }
        const indexed: string[] = []

        for (const route of seo.prerenderRoutes()) {
          const { title, description, noindex, jsonLd } = seo.metaFor(route, ticketsLive)
          const url = seo.canonical(route)
          const set = (html: string, re: RegExp, value: string) => {
            if (!re.test(html)) throw new Error(`prerender-meta: tag not found in index.html: ${re}`)
            return html.replace(re, (_m, a: string, b: string) => `${a}${esc(value)}${b}`)
          }
          let html = template
          html = set(html, /(<title>)[^<]*(<\/title>)/, title)
          html = set(html, /(<meta name="description" content=")[^"]*(")/, description)
          html = set(html, /(<link rel="canonical" href=")[^"]*(")/, url)
          html = set(html, /(<meta name="robots" content=")[^"]*(")/, noindex ? 'noindex, nofollow' : 'index, follow')
          html = set(html, /(<meta property="og:title" content=")[^"]*(")/, title)
          html = set(html, /(<meta property="og:description" content=")[^"]*(")/, description)
          html = set(html, /(<meta property="og:url" content=")[^"]*(")/, url)
          html = set(html, /(<meta name="twitter:title" content=")[^"]*(")/, title)
          html = set(html, /(<meta name="twitter:description" content=")[^"]*(")/, description)
          if (jsonLd) {
            const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
            html = html.replace('</head>', `<script id="seo-jsonld" type="application/ld+json">${json}</script>\n</head>`)
          }

          const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`
          await fs.mkdir(path.dirname(path.join(outDir, file)), { recursive: true })
          await fs.writeFile(path.join(outDir, file), html)
          if (!noindex) indexed.push(url)
        }

        // Any URL Vercel can't match gets dist/404.html with a real 404 status.
        // It boots the app, which renders the branded NotFound page for unknown paths.
        const notFound = template
          .replace(/(<title>)[^<]*(<\/title>)/, '$1Page not found | MBO$2')
          .replace(/(<meta name="robots" content=")[^"]*(")/, '$1noindex, nofollow$2')
          .replace(/\s*<link rel="canonical"[^>]*>/, '')
        if (notFound === template) throw new Error('prerender-meta: could not build 404.html')
        await fs.writeFile(path.join(outDir, '404.html'), notFound)

        const today = new Date().toISOString().slice(0, 10)
        const sitemap =
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          indexed.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
          '\n</urlset>\n'
        await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemap)
        config.logger.info(`prerender-meta: ${seo.prerenderRoutes().length} pages, ${indexed.length} in sitemap`)
      } finally {
        await server.close()
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadFonts(), prerenderMeta()],
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
