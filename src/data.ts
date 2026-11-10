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
  /** Only nights with this set can be bought; the rest show "On sale soon". */
  onSale?: boolean
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
    image: placeholder('MBO RASTA', 1400, 1600),
  },
  {
    id: 'artist-02',
    name: 'Royal Musiq',
    role: 'Artist',
    bio: 'Royal Musiq on the bill — melodic runs and a floor that does not sit down.',
    image: placeholder('ROYAL MUSIQ', 1400, 1600, '161616', 'f3eee6'),
  },
  {
    id: 'artist-03',
    name: 'W4DE',
    role: 'Artist',
    bio: 'W4DE for the peak hours — sharp selections made for packed Gabs nights.',
    image: placeholder('W4DE', 1400, 1600),
  },
  {
    id: 'artist-04',
    name: 'Remy',
    role: 'Artist',
    bio: 'Remy closes the room soft or loud — whichever the night asks for.',
    image: placeholder('REMY', 1400, 1600, '161616', 'c9a27a'),
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
  { id: 'member-03', name: 'Leruo', role: 'EL JEFE', image: '/img/team/member-03.jpg' },
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
    // MBO Rasta clip paused for now — restore '/video/nights/DippsDevM2.mp4' to turn it back on.
    clips: [],
    onSale: true,
    teaser:
      'MBO Rasta opens at The Ponds — supper first, then the floor takes over.',
    tiers: [
      { id: 'general', name: 'General', price: 150, remaining: 80 },
      { id: 'vip', name: 'VIP', price: 280, remaining: 20 },
    ],
  },
  {
    id: 'night-02',
    title: 'House of Habanos',
    artistIds: ['artist-02'],
    venueId: 'venue-01',
    date: '03 Oct 2026',
    time: '22:00',
    image: placeholder(' ', 1800, 1200, '161616', 'f3eee6'),
    clips: ['/video/nights/night-02-artist.mp4', '/video/nights/night-02-event.mp4'],
    onSale: true,
    teaser:
      'Royal Musiq takes House of Habanos past midnight — no chill-out, just the run.',
    tiers: [
      { id: 'general', name: 'General', price: 150, remaining: 180 },
      { id: 'vip', name: 'VIP', price: 280, remaining: 40 },
    ],
  },
  {
    id: 'night-03',
    title: 'Bahama Live',
    artistIds: ['artist-03'],
    venueId: 'venue-03',
    date: '17 Oct 2026',
    time: '21:00',
    image: placeholder(' ', 1800, 1200),
    clips: ['/video/nights/night-03-artist.mp4', '/video/nights/night-03-event.mp4'],
    teaser:
      'W4DE at Bahama Lounge — one of the loudest rooms on the Gabs calendar.',
    tiers: [
      { id: 'general', name: 'General', price: 180, remaining: 100 },
      { id: 'vip', name: 'VIP', price: 320, remaining: 24 },
    ],
  },
  {
    id: 'night-04',
    title: '50two Sessions',
    artistIds: ['artist-04'],
    venueId: 'venue-04',
    date: '31 Oct 2026',
    time: '21:30',
    image: placeholder(' ', 1800, 1200, '161616', 'c9a27a'),
    clips: ['/video/nights/night-04-artist.mp4', '/video/nights/night-04-event.mp4'],
    teaser:
      'Remy on the iTowers rooftop at Table50two — city lights and a late last song.',
    tiers: [
      { id: 'general', name: 'General', price: 160, remaining: 60 },
      { id: 'vip', name: 'VIP', price: 350, remaining: 18 },
    ],
  },
]

export const products: Product[] = [
  {
    id: 'product-01',
    name: 'MBO Mark Tee',
    price: 280,
    drop: 'Core drop',
    image: placeholder('MBO MARK TEE', 1200, 1200),
    nightId: 'night-02',
  },
  {
    id: 'product-02',
    name: 'On the Way Cap',
    price: 220,
    drop: 'Core drop',
    image: placeholder('ON THE WAY CAP', 1200, 1200, '161616', 'f3eee6'),
  },
  {
    id: 'product-03',
    name: 'Ponds Live Poster',
    price: 150,
    drop: 'Night print',
    image: placeholder('PONDS POSTER', 1200, 1200),
    nightId: 'night-01',
  },
  {
    id: 'product-04',
    name: 'House of Habanos Hoodie',
    price: 450,
    drop: 'Night print',
    soldOut: true,
    image: placeholder('HABANOS HOODIE', 1200, 1200, '161616', 'ff5a3c'),
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

export function canBuy(night: Night) {
  return Boolean(night.onSale) && !night.soldOut
}

export function nextOpenNight() {
  return nights.find(canBuy)
}

export const SHOWREEL = nights.map((night) => night.image)

export function showreelClips() {
  const fromNights = nights.flatMap((night) => night.clips)
  return SHOWREEL_CLIPS.length > 0 ? SHOWREEL_CLIPS : fromNights
}
