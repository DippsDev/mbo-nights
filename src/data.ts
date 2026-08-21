export type VenueType = 'club' | 'restaurant'

export type Artist = {
  id: string
  name: string
  role: string
  bio: string
  image: string
}

export type Venue = {
  id: string
  name: string
  type: VenueType
  city: string
  image: string
  blurb: string
}

export type TicketTier = {
  id: string
  name: string
  price: number
  remaining: number
}

export type Night = {
  id: string
  title: string
  artistIds: string[]
  venueId: string
  date: string
  time: string
  image: string
  /** Artist music-video cuts and MBO event footage. Drop files in public/video then add paths. */
  clips: string[]
  soldOut?: boolean
  teaser: string
  tiers: TicketTier[]
}

export type Product = {
  id: string
  name: string
  price: number
  image: string
  drop: string
  soldOut?: boolean
  nightId?: string
}

export const PLACEHOLDER_KICKER = 'Placeholder'
export const PLACEHOLDER_BODY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Replace this copy with the real description.'
export const PLACEHOLDER_SHORT =
  'Placeholder text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'

/** Labeled SVG so images never depend on a stock-photo CDN. */
export function placeholder(
  label: string,
  w = 1600,
  h = 900,
  bg = '111111',
  fg = 'd6ff4b',
) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <rect fill="#${bg}" width="${w}" height="${h}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#${fg}" font-family="Arial,sans-serif" font-size="${Math.round(Math.min(w, h) / 22)}" letter-spacing="6">${label}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const HERO_IMAGE = placeholder('HERO IMAGE', 1920, 1080)

/** Hero background reel. */
export const SHOWREEL_CLIPS: string[] = ['/video/DippsDevMp4.mp4']

export const CAPABILITIES = [
  {
    id: '01',
    title: 'Section title 01',
    to: '/events',
    image: placeholder('CAPABILITY 01', 1600, 1000),
    blurb: PLACEHOLDER_BODY,
  },
  {
    id: '02',
    title: 'Section title 02',
    to: '/artists',
    image: placeholder('CAPABILITY 02', 1600, 1000, '161616', 'f3eee6'),
    blurb: PLACEHOLDER_BODY,
  },
] as const

export const artists: Artist[] = [
  {
    id: 'artist-01',
    name: 'Artist name 01',
    role: 'Role / genre',
    bio: PLACEHOLDER_BODY,
    image: placeholder('ARTIST 01', 1400, 1600),
  },
  {
    id: 'artist-02',
    name: 'Artist name 02',
    role: 'Role / genre',
    bio: PLACEHOLDER_BODY,
    image: placeholder('ARTIST 02', 1400, 1600, '161616', 'f3eee6'),
  },
  {
    id: 'artist-03',
    name: 'Artist name 03',
    role: 'Role / genre',
    bio: PLACEHOLDER_BODY,
    image: placeholder('ARTIST 03', 1400, 1600),
  },
  {
    id: 'artist-04',
    name: 'Artist name 04',
    role: 'Role / genre',
    bio: PLACEHOLDER_BODY,
    image: placeholder('ARTIST 04', 1400, 1600, '161616', 'c9a27a'),
  },
  {
    id: 'artist-05',
    name: 'Artist name 05',
    role: 'Role / genre',
    bio: PLACEHOLDER_BODY,
    image: placeholder('ARTIST 05', 1400, 1600),
  },
  {
    id: 'artist-06',
    name: 'Artist name 06',
    role: 'Role / genre',
    bio: PLACEHOLDER_BODY,
    image: placeholder('ARTIST 06', 1400, 1600, '161616', 'f3eee6'),
  },
]

export const venues: Venue[] = [
  {
    id: 'venue-01',
    name: 'Venue name 01',
    type: 'club',
    city: 'City name',
    image: placeholder('CLUB PHOTO', 1600, 1000),
    blurb: PLACEHOLDER_SHORT,
  },
  {
    id: 'venue-02',
    name: 'Venue name 02',
    type: 'restaurant',
    city: 'City name',
    image: placeholder('RESTAURANT PHOTO', 1600, 1000, '161616', 'c9a27a'),
    blurb: PLACEHOLDER_SHORT,
  },
  {
    id: 'venue-03',
    name: 'Venue name 03',
    type: 'club',
    city: 'City name',
    image: placeholder('CLUB PHOTO', 1600, 1000, '1a1a1a', 'f3eee6'),
    blurb: PLACEHOLDER_SHORT,
  },
  {
    id: 'venue-04',
    name: 'Venue name 04',
    type: 'restaurant',
    city: 'City name',
    image: placeholder('RESTAURANT PHOTO', 1600, 1000, '161616', 'c9a27a'),
    blurb: PLACEHOLDER_SHORT,
  },
]

export const nights: Night[] = [
  {
    id: 'night-01',
    title: 'Event title 01',
    artistIds: ['artist-01'],
    venueId: 'venue-02',
    date: 'DD MMM YYYY',
    time: '00:00',
    image: placeholder('EVENT IMAGE 01', 1800, 1200),
    clips: ['/video/nights/night-01-artist.mp4', '/video/nights/night-01-event.mp4'],
    teaser: PLACEHOLDER_SHORT,
    tiers: [
      { id: 'a', name: 'Ticket type A', price: 0, remaining: 12 },
      { id: 'b', name: 'Ticket type B', price: 0, remaining: 40 },
    ],
  },
  {
    id: 'night-02',
    title: 'Event title 02',
    artistIds: ['artist-02'],
    venueId: 'venue-01',
    date: 'DD MMM YYYY',
    time: '00:00',
    image: placeholder('EVENT IMAGE 02', 1800, 1200, '161616', 'f3eee6'),
    clips: ['/video/nights/night-02-artist.mp4', '/video/nights/night-02-event.mp4'],
    teaser: PLACEHOLDER_SHORT,
    tiers: [
      { id: 'a', name: 'Ticket type A', price: 0, remaining: 180 },
      { id: 'b', name: 'Ticket type B', price: 0, remaining: 40 },
    ],
  },
]

export const products: Product[] = [
  {
    id: 'product-01',
    name: 'Product name 01',
    price: 0,
    drop: 'Drop name',
    image: placeholder('MERCH 01', 1200, 1200),
    nightId: 'night-02',
  },
  {
    id: 'product-02',
    name: 'Product name 02',
    price: 0,
    drop: 'Drop name',
    image: placeholder('MERCH 02', 1200, 1200, '161616', 'f3eee6'),
  },
  {
    id: 'product-03',
    name: 'Product name 03',
    price: 0,
    drop: 'Drop name',
    image: placeholder('MERCH 03', 1200, 1200),
    nightId: 'night-01',
  },
  {
    id: 'product-04',
    name: 'Product name 04',
    price: 0,
    drop: 'Drop name',
    soldOut: true,
    image: placeholder('MERCH 04', 1200, 1200, '161616', 'ff5a3c'),
    nightId: 'night-02',
  },
]

export function getArtist(id: string) {
  return artists.find((a) => a.id === id)
}

export function getVenue(id: string) {
  return venues.find((v) => v.id === id)
}

export function getNight(id: string) {
  return nights.find((n) => n.id === id)
}

export function getProduct(id: string) {
  return products.find((p) => p.id === id)
}

export function artistsFor(night: Night) {
  return night.artistIds.map((id) => getArtist(id)).filter(Boolean) as Artist[]
}

export function nightsForArtist(artistId: string) {
  return nights.filter((n) => n.artistIds.includes(artistId))
}

export function nightsForVenue(venueId: string) {
  return nights.filter((n) => n.venueId === venueId)
}

export function merchForNight(nightId: string) {
  return products.filter((p) => p.nightId === nightId)
}

export function nextOpenNight() {
  return nights.find((n) => !n.soldOut)
}

export const SHOWREEL = nights.map((night) => night.image)

export function showreelClips() {
  const fromNights = nights.flatMap((night) => night.clips)
  return SHOWREEL_CLIPS.length > 0 ? SHOWREEL_CLIPS : fromNights
}
