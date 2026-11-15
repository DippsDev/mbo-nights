/**
 * Page titles, descriptions and structured data for every route.
 * No React here: Seo.tsx uses it in the browser, and the build (vite.config.ts)
 * uses it to write a pre-tagged HTML file per public page, so link previews on
 * WhatsApp / Facebook / X (which don't run JavaScript) show the right page.
 */
import {
  artists,
  BRAND,
  BRAND_BODY,
  BRAND_FULL,
  BRAND_TAGLINE,
  canBuy,
  CHANNELS,
  getArtist,
  getNight,
  getProduct,
  getVenue,
  nights,
  products,
  venues,
} from '../data'
import { LEGAL, getLegal } from '../legal'

// www is the live host (non-www 301s to it), so canonicals must use it too.
export const SITE_URL = 'https://www.morebandsontheway.com'
export const DEFAULT_IMAGE = `${SITE_URL}/IMG_1990-scaled.jpeg`
const DEFAULT_TITLE = `${BRAND} — ${BRAND_FULL}`

export type Meta = { title: string; description: string; noindex?: boolean; jsonLd?: object }

type NightT = NonNullable<ReturnType<typeof getNight>>
type VenueT = NonNullable<ReturnType<typeof getVenue>>

// Private / transactional routes stay out of search results.
const PRIVATE = /^\/(admin|order|checkout|bag|tickets)(\/|$)/

/** "19 Sep 2026" + "20:00" → "2026-09-19T20:00:00+02:00" (Botswana, CAT). */
function isoStart(date: string, time: string) {
  if (!date) return undefined
  const d = new Date(`${date} 12:00 UTC`)
  if (Number.isNaN(d.getTime())) return undefined
  const ymd = d.toISOString().slice(0, 10)
  return /^\d{1,2}:\d{2}$/.test(time) ? `${ymd}T${time.padStart(5, '0')}:00+02:00` : ymd
}

/** A night with a real date and details — the only kind worth a search listing. */
const isAnnounced = (n: NightT) => !n.comingSoon && Boolean(isoStart(n.date, n.time))

/** True once the night's date has passed (whole day, Botswana time). */
function isPast(n: NightT, now = new Date()) {
  const start = isoStart(n.date, '23:59')
  return start ? new Date(start).getTime() < now.getTime() : false
}

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: DEFAULT_TITLE,
  alternateName: [BRAND, BRAND_FULL, 'MBO Nights', 'mbonights', 'morebandsotw', 'MBO Botswana'],
  url: `${SITE_URL}/`,
  '@id': `${SITE_URL}/#org`,
  image: DEFAULT_IMAGE,
  address: { '@type': 'PostalAddress', addressLocality: 'Gaborone', addressCountry: 'BW' },
  logo: `${SITE_URL}/icon-512.png`,
  description: BRAND_BODY,
  areaServed: 'Botswana',
  sameAs: CHANNELS.map((c) => c.href).filter((h) => h.startsWith('http')),
}

const WEBSITE_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MBO Nights',
  alternateName: [BRAND_FULL, 'mbonights', 'morebandsotw'],
  url: `${SITE_URL}/`,
  publisher: { '@id': `${SITE_URL}/#org` },
}

function placeLd(venue: VenueT) {
  return {
    '@type': 'MusicVenue',
    name: venue.name,
    url: `${SITE_URL}/venues/${venue.id}`,
    address: {
      '@type': 'PostalAddress',
      ...(venue.address ? { streetAddress: venue.address } : {}),
      addressLocality: venue.city,
      addressCountry: 'BW',
    },
  }
}

const venueLd = (venue: VenueT) => ({ '@context': 'https://schema.org', ...placeLd(venue), description: venue.blurb })

function eventLd(night: NightT, venue?: VenueT) {
  const url = `${SITE_URL}/events/${night.id}`
  const past = isPast(night)
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: night.title,
    description: night.teaser,
    startDate: isoStart(night.date, night.time),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    image: [DEFAULT_IMAGE],
    location: venue ? placeLd(venue) : undefined,
    organizer: { '@type': 'Organization', name: ORG_LD.name, url: ORG_LD.url },
    // A finished night has nothing to sell; claiming stock would be stale markup.
    offers: past
      ? undefined
      : night.tiers.map((t) => ({
          '@type': 'Offer',
          name: t.name,
          price: t.price,
          priceCurrency: 'BWP',
          url,
          availability:
            canBuy(night) && t.remaining > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        })),
  }
}

/**
 * @param ticketsLive  whether event pages show the real event (true) or the
 *   "Coming soon" screen (false). Hidden event pages are kept out of search.
 */
export function metaFor(path: string, ticketsLive: boolean): Meta {
  const seg = path.split('/').filter(Boolean)
  const noindex = PRIVATE.test(path)

  if (seg[0] === 'events' && seg[1]) {
    const night = getNight(seg[1])
    if (night && isAnnounced(night)) {
      const venue = getVenue(night.venueId)
      return {
        title: `${night.title} — ${night.date}${venue ? ` at ${venue.name}` : ''} | ${BRAND}`,
        description: `${night.teaser} ${night.date}, ${night.time}${venue ? ` · ${venue.name}, ${venue.city}` : ''}.`,
        jsonLd: ticketsLive ? eventLd(night, venue) : undefined,
        noindex: !ticketsLive,
      }
    }
    if (night) {
      return { title: `Coming soon | ${BRAND}`, description: night.teaser || BRAND_TAGLINE, noindex: true }
    }
  }
  if (seg[0] === 'artists' && seg[1]) {
    const artist = getArtist(seg[1])
    if (artist) {
      return {
        title: `${artist.name} — Live in Gaborone | ${BRAND}`,
        description: artist.bio,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'MusicGroup',
          name: artist.name,
          description: artist.bio,
          url: `${SITE_URL}/artists/${artist.id}`,
        },
      }
    }
  }
  if (seg[0] === 'shop' && seg[1]) {
    const product = getProduct(seg[1])
    if (product?.comingSoon) {
      return { title: `Coming soon | ${BRAND} Shop`, description: product.teaser || BRAND_TAGLINE, noindex: true }
    }
    if (product) {
      return {
        title: `${product.name} | ${BRAND} Shop`,
        description: `${product.name} — ${product.drop} from ${BRAND}, P${product.price}.`,
      }
    }
  }
  if (seg[0] === 'venues' && seg[1]) {
    const venue = getVenue(seg[1])
    if (venue) {
      return {
        title: `${venue.name}, ${venue.city} — Live music venue | ${BRAND}`,
        description: venue.blurb,
        jsonLd: venueLd(venue),
      }
    }
  }
  if (seg[0] === 'legal' && seg[1]) {
    const doc = getLegal(seg[1])
    if (doc) return { title: `${doc.title} | ${BRAND}`, description: `${doc.title} for ${BRAND} — ${BRAND_FULL}.` }
  }

  const fixed: Record<string, Omit<Meta, 'noindex'>> = {
    about: {
      title: `About | ${DEFAULT_TITLE}`,
      description:
        'MBO — More Bands On the way — books live music across Botswana, putting rising acts on stages in Gaborone.',
    },
    artists: { title: `Artists | ${BRAND}`, description: `The artists playing ${BRAND} nights in Gaborone.` },
    shop: { title: `Shop | ${BRAND}`, description: `${BRAND} merch — tees, caps, prints and night drops.` },
    tickets: { title: `My Tickets | ${BRAND}`, description: `Find your ${BRAND} tickets.` },
    bag: { title: `Bag | ${BRAND}`, description: `Your ${BRAND} bag.` },
    checkout: { title: `Checkout | ${BRAND}`, description: `Checkout for ${BRAND} tickets.` },
    order: { title: `Your Order | ${BRAND}`, description: `Your ${BRAND} order.` },
    admin: { title: `Admin | ${BRAND}`, description: `${BRAND} admin.` },
  }
  if (seg.length === 0)
    return {
      title: 'MBO Nights | Live Music in Gaborone, Botswana',
      description:
        'MBO Nights (More Bands On the Way) — live music nights in Gaborone, Botswana. New bands on real stages — see upcoming nights, lineups and tickets.',
      jsonLd: [ORG_LD, WEBSITE_LD],
    }
  const hit = fixed[seg[0]]
  if (hit) return { ...hit, noindex }
  // Anything else renders the 404 page.
  return { title: `Not found | ${BRAND}`, description: BRAND_TAGLINE, noindex: true }
}

/** Public pages that get their own pre-tagged HTML file at build time. */
export function prerenderRoutes() {
  return [
    '/',
    '/about',
    '/artists',
    ...artists.map((a) => `/artists/${a.id}`),
    '/shop',
    ...products.filter((p) => !p.comingSoon).map((p) => `/shop/${p.id}`),
    ...nights.map((n) => `/events/${n.id}`),
    ...venues.map((v) => `/venues/${v.id}`),
    ...LEGAL.map((d) => `/legal/${d.slug}`),
  ]
}

/** Canonical URL for a path (no trailing slash except the home page). */
export const canonical = (path: string) => `${SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`

const h = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Plain HTML written inside #root at build time so crawlers that don't run
 * JavaScript see a heading, real text and links. React replaces it on mount.
 */
export function bodyFor(path: string, ticketsLive: boolean): string {
  const { title, description } = metaFor(path, ticketsLive)
  const heading = title.split(' | ')[0].split(' — ')[0]
  const nav = [
    ['/', 'Home'],
    ['/about', 'About MBO'],
    ['/artists', 'Artists'],
    ['/shop', 'Shop'],
    ...venues.map((v) => [`/venues/${v.id}`, `${v.name}, ${v.city}`]),
    ...artists.map((a) => [`/artists/${a.id}`, a.name]),
    ...LEGAL.map((d) => [`/legal/${d.slug}`, d.title]),
  ]
  const links = nav.map(([href, label]) => `<li><a href="${href}">${h(label)}</a></li>`).join('')
  const ext = CHANNELS.filter((c) => c.href.startsWith('http'))
    .map((c) => `<li><a href="${h(c.href)}" rel="noopener">${h(c.label)}</a></li>`)
    .join('')

  let main = `<p>${h(description)}</p>`
  if (path === '/') {
    const upcoming = nights
      .filter(isAnnounced)
      .map((n) => {
        const v = getVenue(n.venueId)
        return `<li><a href="/events/${n.id}">${h(n.title)}</a> — ${h(n.date)}${v ? `, ${h(v.name)}` : ''}</li>`
      })
      .join('')
    main = `
<p>${h(BRAND_BODY)}</p>
<h2>Live music nights in Gaborone</h2>
<p>MBO Nights is where Botswana's next wave of bands plays for real crowds. We book rising artists into restaurant stages and late club floors across Gaborone, then handle the night: the lineup, the sound, the tickets and the door. If you love hearing a band before everyone else does, this is your room.</p>
<p>${h(BRAND_TAGLINE)} Every MBO night pairs a venue we trust with acts worth the trip — roots, soul, rock, jazz and everything between. Supper comes first at some rooms; at others the floor takes over from the first song.</p>
<h2>Upcoming nights and tickets</h2>
${upcoming ? `<ul>${upcoming}</ul>` : '<p>New dates are on the way. Follow MBO to hear first when tickets go on sale.</p>'}
<p>Tickets are sold online and scanned at the door, so you can buy ahead, keep your pass on your phone and walk straight in.</p>
<h2>Venues</h2>
<ul>${venues.map((v) => `<li><a href="/venues/${v.id}">${h(v.name)}</a> — ${h(v.blurb)}</li>`).join('')}</ul>
<h2>Artists</h2>
<ul>${artists.map((a) => `<li><a href="/artists/${a.id}">${h(a.name)}</a> — ${h(a.bio)}</li>`).join('')}</ul>
<h2>For bands and venues</h2>
<p>Are you a band looking for a stage, or a venue that wants live music in Gaborone? MBO — More Bands On the way — works with both. Read more <a href="/about">about MBO</a> and get in touch.</p>`
  }
  return `<div class="seo-static"><header><nav aria-label="Main"><ul>${links}</ul></nav></header><main><h1>${h(heading)}</h1>${main}</main>${ext ? `<footer><ul>${ext}</ul></footer>` : ''}</div>`
}
