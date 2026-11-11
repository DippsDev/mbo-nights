import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BRAND, BRAND_BODY, BRAND_FULL, BRAND_TAGLINE, canBuy, CHANNELS, getNight, getVenue } from '../data'
import { getLegal } from '../legal'

export const SITE_URL = 'https://morebandsontheway.com'
const DEFAULT_TITLE = `${BRAND} — ${BRAND_FULL}`
const DEFAULT_IMAGE = `${SITE_URL}/IMG_1990-scaled.jpeg`

type Meta = { title: string; description: string; noindex?: boolean; jsonLd?: object }

// Private / transactional routes stay out of search results.
const PRIVATE = /^\/(admin|order|checkout|bag|tickets)(\/|$)/

function metaFor(path: string): Meta {
  const seg = path.split('/').filter(Boolean)
  const noindex = PRIVATE.test(path)

  if (seg[0] === 'events' && seg[1]) {
    const night = getNight(seg[1])
    if (night) {
      const venue = getVenue(night.venueId)
      return {
        title: `${night.title} — ${night.date}${venue ? ` at ${venue.name}` : ''} | ${BRAND}`,
        description: `${night.teaser} ${night.date}, ${night.time}${venue ? ` · ${venue.name}, ${venue.city}` : ''}.`,
        jsonLd: eventLd(night, venue),
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
    shop: { title: `Shop | ${BRAND}`, description: `${BRAND} merch — coming soon.` },
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

type NightT = NonNullable<ReturnType<typeof getNight>>
type VenueT = NonNullable<ReturnType<typeof getVenue>>

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: `${BRAND} — ${BRAND_FULL}`,
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
    address: { '@type': 'PostalAddress', addressLocality: venue.city, addressCountry: 'BW' },
  }
}

const venueLd = (venue: VenueT) => ({
  '@context': 'https://schema.org',
  ...placeLd(venue),
  description: venue.blurb,
})

/** "19 Sep 2026" + "20:00" → "2026-09-19T20:00:00+02:00" (Botswana, CAT). */
function isoStart(date: string, time: string) {
  const d = new Date(`${date} 12:00 UTC`)
  if (Number.isNaN(d.getTime())) return undefined
  const ymd = d.toISOString().slice(0, 10)
  return /^\d{1,2}:\d{2}$/.test(time) ? `${ymd}T${time.padStart(5, '0')}:00+02:00` : ymd
}

function eventLd(night: NightT, venue?: VenueT) {
  const url = `${SITE_URL}/events/${night.id}`
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
    offers: night.tiers.map((t) => ({
      '@type': 'Offer',
      name: t.name,
      price: t.price,
      priceCurrency: 'BWP',
      url,
      availability: canBuy(night) && t.remaining > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    })),
  }
}

function setTag(selector: string, attr: 'name' | 'property' | 'rel', key: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(attr === 'rel' ? 'link' : 'meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute(attr === 'rel' ? 'href' : 'content', value)
}

/** Keeps <title>, description, canonical, robots and social tags in sync with the route. */
export default function Seo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const { title, description, noindex, jsonLd } = metaFor(pathname)
    const url = `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`
    document.title = title
    setTag('meta[name="description"]', 'name', 'description', description)
    setTag('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setTag('link[rel="canonical"]', 'rel', 'canonical', url)
    setTag('meta[property="og:title"]', 'property', 'og:title', title)
    setTag('meta[property="og:description"]', 'property', 'og:description', description)
    setTag('meta[property="og:url"]', 'property', 'og:url', url)
    setTag('meta[property="og:image"]', 'property', 'og:image', DEFAULT_IMAGE)
    setTag('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setTag('meta[name="twitter:description"]', 'name', 'twitter:description', description)

    document.getElementById('seo-jsonld')?.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.id = 'seo-jsonld'
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [pathname])

  return null
}
