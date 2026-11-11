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

export const SITE_URL = 'https://morebandsontheway.com'
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
  alternateName: BRAND,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon-512.png`,
  description: BRAND_BODY,
  areaServed: 'Botswana',
  sameAs: CHANNELS.map((c) => c.href).filter((h) => h.startsWith('http')),
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
  if (seg.length === 0) return { title: DEFAULT_TITLE, description: BRAND_TAGLINE, jsonLd: ORG_LD }
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
