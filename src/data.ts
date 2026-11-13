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
  /** Street address for search results, e.g. 'Plot 123, Western Commercial Road'. */
  address?: string
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
  /** Only nights with this set can be bought; the rest show "On sale soon". */
  onSale?: boolean
  /**
   * A slot we know is coming but have no details for yet. Shows as a "Coming soon"
   * ticket on the home page and is hidden from event, venue, artist and door pages.
   * To announce it: fill in title, artistIds, venueId, date, time, teaser and tiers,
   * then delete this flag.
   */
  comingSoon?: boolean
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
  /**
   * A slot we know is coming but have no details for yet. Shows as a "Coming soon"
   * ticket in the shop, with no product page. To launch it: fill in name, price,
   * drop, image and teaser, then delete this flag.
   */
  comingSoon?: boolean
  teaser?: string
}

export const BRAND = 'MBO'
export const BRAND_FULL = 'More Bands On the way'
export const BRAND_KICKER = 'More Bands On the way'
export const BRAND_TAGLINE =
  'Live nights across Gaborone — new acts, real rooms, and the next song always coming.'
export const BRAND_BODY =
  'MBO — More Bands On the way — books live music across Botswana. From restaurant stages to late club floors in Gaborone, we put rising acts in front of people who show up.'

/**
 * Footer "Channels" links. Fill in the real addresses; any left empty are hidden.
 * Email as 'mailto:you@domain.com', WhatsApp as 'https://wa.me/267XXXXXXXX'.
 */
export const CHANNELS: { label: string; href: string }[] = [
  { label: 'Instagram', href: '' },
  { label: 'TikTok', href: '' },
  { label: 'WhatsApp', href: '' },
  { label: 'Email', href: '' },
]

/** Labeled SVG so images never depend on a stock-photo CDN. */
export function placeholder(
  label: string,
  w = 1600,
  h = 900,
  bg = '111111',
  fg = 'd6ff4b',
) {
  const safe = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <rect fill="#${bg}" width="${w}" height="${h}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#${fg}" font-family="Arial,sans-serif" font-size="${Math.round(Math.min(w, h) / 32)}" letter-spacing="3">${safe}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const HERO_IMAGE = '/IMG_1990-scaled.jpeg'

/** Hero background reel. */
export const SHOWREEL_CLIPS: string[] = []

/**
 * Home page section panels. `video` is an optional muted background loop — drop an
 * .mp4 in public/video/sections/ and set the path (e.g. '/video/sections/artists.mp4').
 * Leave it '' to show `image` instead. A matching .jpg next to the clip is used as its
 * first frame while it loads.
 */
export const CAPABILITIES: {
  id: string
  title: string
  to: string
  image: string
  video: string
  /** Which part of the clip stays in frame when it's cropped, as CSS object-position. */
  focus?: string
  blurb: string
}[] = [
  {
    id: '01',
    title: 'Shop',
    to: '/shop',
    video: '',
    focus: 'center 62%',
    image: '/img/sections/shop.jpg',
    blurb:
      'Tees, caps, and night prints while the drop lasts — grab merch before the room fills.',
  },
  {
    id: '02',
    title: 'About',
    to: '/about',
    video: '/video/sections/about.mp4',
    focus: 'center 88%',
    image: placeholder('COMING SOON', 1600, 1000, '161616', 'c9a27a'),
    blurb:
      'More Bands On the way — why we book the rooms and keep Gaborone’s calendar moving.',
  },
  {
    id: '03',
    title: 'Artists',
    to: '/artists',
    video: '/video/sections/artists.mp4',
    focus: 'center 32%',
    image: placeholder('COMING SOON', 1600, 1000, '161616', 'f3eee6'),
    blurb:
      'Batswana acts and touring guests we are pushing next — first headliners and familiar names.',
  },
]

export const artists: Artist[] = [
  {
    id: 'artist-01',
    name: 'MBO Rasta',
    role: 'Artist',
    bio: 'MBO Rasta brings the night in live — roots energy for Gaborone rooms that stay open late.',
    image: '/img/artists/mbo-rasta.jpg',
  },
]

export const venues: Venue[] = [
  {
    id: 'venue-01',
    name: 'Bull & Bush',
    type: 'club',
    city: 'Gaborone',
    image: placeholder('BULL & BUSH', 1600, 1000),
    blurb:
      'Broadhurst classic — steaks, cold beer, live bands, and the kind of night Gabs still talks about.',
  },
  {
    id: 'venue-02',
    name: 'The Ponds',
    type: 'restaurant',
    city: 'Gaborone',
    image: placeholder('THE PONDS', 1600, 1000, '161616', 'c9a27a'),
    blurb:
      'Western Commercial Road favourite — dinner, live music, DJ sets, and a room that stays late.',
  },
  {
    id: 'venue-03',
    name: 'Bahama Lounge',
    type: 'club',
    city: 'Gaborone',
    image: placeholder('BAHAMA LOUNGE', 1600, 1000, '1a1a1a', 'f3eee6'),
    blurb:
      'CBD lounge energy for bigger bills — lights low, floor open, and the night still going.',
  },
  {
    id: 'venue-04',
    name: 'Table50two',
    type: 'restaurant',
    city: 'Gaborone',
    image: placeholder('TABLE50TWO', 1600, 1000, '161616', 'c9a27a'),
    blurb:
      'Rooftop dining atop iTowers — city views, fine plates, and seated nights with a soundtrack.',
  },
]

export type TeamMember = {
  id: string
  name: string
  role: string
  image: string
}

/** About page portraits. Swap names, roles and images (e.g. '/images/team/name.jpg') when ready. */
export const team: TeamMember[] = [
  { id: 'member-01', name: 'Kgosi', role: 'EL PATRON', image: '/img/team/member-01.jpg' },
  { id: 'member-02', name: 'MBO Rasta', role: 'BIG BOSS', image: '/img/team/member-02.jpg' },
]

export const nights: Night[] = [
  {
    id: 'night-01',
    title: 'Ponds Live',
    artistIds: ['artist-01'],
    venueId: 'venue-02',
    date: '19 Sep 2026',
    time: '20:00',
    image: placeholder(' ', 1800, 1200),
    // Muted H.264 loop cut from IMG_8964.MOV (the .jpg beside it is the poster frame).
    clips: ['/video/nights/night-01.mp4'],
    // Sales paused: every night shows as Coming soon until tickets open.
    comingSoon: true,
    teaser:
      'MBO Rasta opens at The Ponds — supper first, then the floor takes over.',
    tiers: [
      { id: 'general', name: 'General', price: 150, remaining: 80 },
      { id: 'vip', name: 'VIP', price: 280, remaining: 20 },
    ],
  },
  // Placeholder slots until the CEO sends the event list. See `comingSoon` on Night.
  {
    id: 'night-02',
    title: 'Coming soon',
    artistIds: [],
    venueId: '',
    date: '',
    time: '',
    image: placeholder(' ', 1800, 1200, '161616', 'f3eee6'),
    clips: [],
    comingSoon: true,
    teaser: 'Next night locking in — lineup, room and date land here first.',
    tiers: [],
  },
  {
    id: 'night-03',
    title: 'Coming soon',
    artistIds: [],
    venueId: '',
    date: '',
    time: '',
    image: placeholder(' ', 1800, 1200, '161616', 'c9a27a'),
    clips: [],
    comingSoon: true,
    teaser: 'Another room, another act — details drop as soon as they are locked.',
    tiers: [],
  },
  {
    id: 'night-04',
    title: 'Coming soon',
    artistIds: [],
    venueId: '',
    date: '',
    time: '',
    image: placeholder(' ', 1800, 1200, '161616', 'd6ff4b'),
    clips: [],
    comingSoon: true,
    teaser: 'More bands on the way. Watch this space.',
    tiers: [],
  },
]

// Placeholder slots until the first merch drop is confirmed. See `comingSoon` on Product.
export const products: Product[] = [
  {
    id: 'product-01',
    name: 'Coming soon',
    price: 0,
    drop: 'Merch drop 01',
    image: placeholder(' ', 1200, 1200),
    comingSoon: true,
    teaser: 'First MBO piece in the works — details land here first.',
  },
  {
    id: 'product-02',
    name: 'Coming soon',
    price: 0,
    drop: 'Merch drop 02',
    image: placeholder(' ', 1200, 1200, '161616', 'f3eee6'),
    comingSoon: true,
    teaser: 'Another one locking in. Watch this space.',
  },
  {
    id: 'product-03',
    name: 'Coming soon',
    price: 0,
    drop: 'Merch drop 03',
    image: placeholder(' ', 1200, 1200, '161616', 'c9a27a'),
    comingSoon: true,
    teaser: 'More merch on the way.',
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

/** Nights with real details — placeholders flagged `comingSoon` are left out. */
export function announcedNights() {
  return nights.filter((n) => !n.comingSoon)
}

export function nightsForArtist(artistId: string) {
  return announcedNights().filter((n) => n.artistIds.includes(artistId))
}

export function nightsForVenue(venueId: string) {
  return announcedNights().filter((n) => n.venueId === venueId)
}

/** Flip to true once the shop is live; gates merch cross-sells on event pages. */
export const SHOP_OPEN = false

export function merchForNight(nightId: string) {
  return products.filter((p) => p.nightId === nightId)
}

export function canBuy(night: Night) {
  return !night.comingSoon && Boolean(night.onSale) && !night.soldOut
}

export function nextOpenNight() {
  return nights.find(canBuy)
}

export const SHOWREEL = nights.map((night) => night.image)

export function showreelClips() {
  const fromNights = nights.flatMap((night) => night.clips)
  return SHOWREEL_CLIPS.length > 0 ? SHOWREEL_CLIPS : fromNights
}
