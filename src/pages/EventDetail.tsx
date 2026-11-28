import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCart } from '../cart'
import {
  artistsFor,
  canBuy,
  getNight,
  getVenue,
  merchForNight,
  SHOP_OPEN,
} from '../data'
import MenuDeck from '../components/MenuDeck'
import { endsAt, startsAt, stubDate } from '../lib/date'
import { forceMuted, NO_INLINE_VIDEO, useMutedVideoRef } from '../lib/media'
import { MAX_PER_TIER, stockKey, useStock } from '../lib/tickets'

export default function EventDetail() {
  const { id } = useParams()
  const night = id ? getNight(id) : undefined
  const { add, items, notify } = useCart()
  const { stock, error: stockError } = useStock()
  const [ready, setReady] = useState(false)
  const [videoRef, attachVideo] = useMutedVideoRef()
  const [menuOpen, setMenuOpen] = useState(false)

  // Falls back to the night's image if the clip or its poster file isn't in public/ yet.
  const [clipFailed, setClipFailed] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const clip = night?.clips[0]
  const showClip = Boolean(clip && !clipFailed)
  const poster =
    clip && !posterFailed ? clip.replace(/\.mp4$/i, '.jpg') : night?.image || ''

  // Warm cache as soon as this night has a clip (even before play).
  useEffect(() => {
    if (!clip) return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'video'
    link.href = clip
    link.type = 'video/mp4'
    document.head.appendChild(link)
    void fetch(clip, { credentials: 'same-origin', priority: 'high' }).catch(
      () => undefined,
    )
    return () => {
      link.remove()
    }
  }, [clip])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !showClip || NO_INLINE_VIDEO) return

    setReady(false)

    forceMuted(video)
    const play = () => {
      forceMuted(video)
      void video.play().catch(() => undefined)
    }
    const markReady = () => setReady(true)

    const onVis = () => {
      if (document.visibilityState === 'visible') play()
    }

    video.addEventListener('loadeddata', markReady)
    video.addEventListener('playing', markReady)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', play)

    if (video.readyState >= 2) {
      markReady()
      play()
    } else {
      video.addEventListener('loadeddata', play, { once: true })
      video.addEventListener('canplay', play, { once: true })
    }

    return () => {
      video.removeEventListener('loadeddata', markReady)
      video.removeEventListener('playing', markReady)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pageshow', play)
    }
  }, [showClip, clip, videoRef])

  if (!night || night.comingSoon) return <Navigate to="/" replace />

  const venue = getVenue(night.venueId)
  const lineup = artistsFor(night)
  const merch = merchForNight(night.id)
  const when = stubDate(night.date)
  const hasMenu = Boolean(night.menu && night.menu.length > 0)

  const buy = (tierId: string) => {
    const tier = night.tiers.find((t) => t.id === tierId)
    const live = stock?.[stockKey(night.id, tierId)]
    if (!tier || !live || !canBuy(night)) return
    const inBag = items.find((i) => i.key === `ticket:${night.id}:${tier.id}`)?.qty ?? 0
    const max = Math.min(MAX_PER_TIER, live.remaining)
    if (inBag >= max) {
      notify(
        'limit',
        max === 0 ? `${tier.name} is sold out` : `Max ${max} ${tier.name} per order`,
        max === 0 ? undefined : `You already have ${inBag} in your bag`,
      )
      return
    }
    add({
      key: `ticket:${night.id}:${tier.id}`,
      kind: 'ticket',
      refId: night.id,
      name: night.title,
      detail: `${tier.name} · ${night.date} · ${venue?.name}`,
      price: live.price,
      image: night.image,
    })
  }

  return (
    <main className="page">
      <div className="event-layout">
        <div className="media-frame">
          {showClip ? (
            <>
              <img
                className={`event-still${ready ? ' is-hidden' : ''}`}
                src={NO_INLINE_VIDEO && !posterFailed ? clip : poster}
                alt=""
                aria-hidden
                fetchPriority="high"
                decoding="async"
                onError={() => setPosterFailed(true)}
              />
              <video
                onError={() => setClipFailed(true)}
                ref={attachVideo}
                className={`event-clip${ready ? ' is-ready' : ''}`}
                src={clip}
                poster={poster}
                muted
                playsInline
                loop
                preload="auto"
                aria-label={`${night.title} preview`}
              />
            </>
          ) : (
            <img src={night.image} alt={night.title} />
          )}
        </div>
        <div className="page-hero">
          <h1 className="sr-only">
            {night.title} — {night.date}
            {venue ? ` at ${venue.name}` : ''}
          </h1>
          <p className="kicker">
            {venue?.type} · {venue?.name}
          </p>
          {lineup.length > 1 ? (
            <>
              {/* Full list for screen readers and crawlers; sighted visitors get one name at a time. */}
              <ul className="sr-only">
                {lineup.map((artist) => (
                  <li key={artist.id}>{artist.name}</li>
                ))}
              </ul>
              <RotatingName names={lineup.map((a) => a.name)} />
            </>
          ) : (
            <ul className="lineup">
              {lineup.map((artist) => (
                <li key={artist.id}>{artist.name}</li>
              ))}
            </ul>
          )}
          <p className="serif">{night.teaser}</p>
          <p>
            {night.date} · {night.time} ·{' '}
            <Link to={`/venues/${venue?.id}`}>{venue?.name}</Link>
          </p>

          {/* One tear-off ticket per tier, in the homepage ticket style. */}
          <div className="tiers">
            {night.tiers.map((tier) => {
              const live = stock?.[stockKey(night.id, tier.id)]
              const left = live?.remaining ?? 0
              const gone = Boolean(live) && (night.soldOut || left <= 0)
              const soon = !night.onSale
              const loading = !live && !soon
              const locked = soon || gone
              // Free entry: no ticket to buy, so skip stock and the Add button.
              const free = tier.price === 0
              return (
                <article className={`tier-ticket${locked ? ' is-locked' : ''}`} key={tier.id}>
                  <div className="tier-ticket-stub" aria-hidden>
                    <span className="event-ticket-weekday">{when.weekday}</span>
                    <span className="tier-ticket-day">{when.day}</span>
                    <span className="event-ticket-month">{when.month}</span>
                    <span className="tier-ticket-time">{night.time}</span>
                  </div>
                  <div className="tier-ticket-body">
                    <h2 className="tier-ticket-name">{live?.name ?? tier.name}</h2>
                    <p className="tier-ticket-left">
                      {free
                        ? 'No ticket needed'
                        : soon
                        ? 'On sale soon'
                        : loading
                          ? stockError
                            ? 'Can’t load — refresh'
                            : 'Checking…'
                          : gone
                            ? 'Sold out'
                            : `${left} left`}
                    </p>
                    <Countdown at={startsAt(night.date, night.time)} end={endsAt(night.date, night.time, night.endsAt)} />
                  </div>
                  <div className="tier-ticket-buy">
                    {!free && <span className="tier-ticket-price">P{live?.price ?? tier.price}</span>}
                    {free && venue?.coords && (
                      <a
                        className="btn ghost tier-ticket-map"
                        aria-label={`Find location: ${venue.name}`}
                        href={googleDirections(venue.coords)}
                        onClick={(e) => directionsFromHere(e, venue.coords!)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M8 14.5s4.6-4.3 4.6-8a4.6 4.6 0 0 0-9.2 0c0 3.7 4.6 8 4.6 8Z" />
                          <circle cx="8" cy="6.4" r="1.6" />
                        </svg>
                        {/* Hidden on phones, where the pin alone is the button. */}
                        <span className="map-long">Find location</span>
                      </a>
                    )}
                    {hasMenu && (
                      <button
                        className="btn ghost tier-ticket-map"
                        aria-label="Drinks menu"
                        aria-haspopup="dialog"
                        onClick={() => setMenuOpen(true)}
                      >
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M4 1.5v5a1.5 1.5 0 0 0 3 0v-5M5.5 1.5v13" />
                          <path d="M11.5 14.5v-13c-1.7.8-2.5 2.6-2.5 5v2.5h2.5" />
                        </svg>
                        <span className="map-long">Menu</span>
                      </button>
                    )}
                    {!free && <button
                      className="btn"
                      disabled={locked || loading}
                      onClick={() => buy(tier.id)}
                    >
                      {soon ? 'Soon' : gone ? 'Sold out' : 'Add'}
                    </button>}
                  </div>
                </article>
              )
            })}
          </div>

          {SHOP_OPEN && merch.length > 0 && (
            <div>
              <p className="kicker">Related merch</p>
              {merch.map((p) => (
                <Link key={p.id} className="link-arrow" to={`/shop/${p.id}`}>
                  {p.name} · P{p.price}
                  {p.soldOut ? ' · sold out' : ''} →
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasMenu && menuOpen && (
        <MenuDeck
          onClose={() => setMenuOpen(false)}
          title={night.title}
          sections={night.menu!}
        />
      )}
    </main>
  )
}

/**
 * Shows one lineup name at a time: the current name fades up and out, then the
 * next fades up in. The outgoing name is removed once its fade ends, so even if
 * a browser skips the animation (seen on iOS Safari) two names never stack.
 */
function RotatingName({ names }: { names: string[] }) {
  const [i, setI] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  useEffect(() => {
    let clear = 0
    const t = window.setInterval(() => {
      setI((n) => {
        setPrev(n)
        return (n + 1) % names.length
      })
      window.clearTimeout(clear)
      clear = window.setTimeout(() => setPrev(null), OUT_MS)
    }, 2600)
    return () => {
      window.clearInterval(t)
      window.clearTimeout(clear)
    }
  }, [names.length])
  return (
    <p className="lineup lineup-rotate" aria-hidden>
      {/* Keys change each tick so the animations restart. */}
      {prev !== null && (
        <span className="is-out" key={`out-${i}`}>
          {names[prev]}
        </span>
      )}
      <span className={prev !== null ? 'is-in is-waiting' : 'is-in'} key={`in-${i}`}>
        {names[i]}
      </span>
    </p>
  )
}

/** Matches the lineup-out animation length in index.css. */
const OUT_MS = 400

/**
 * Directions from the visitor's current spot; opens the Google Maps app when installed.
 * Used on iPhone too: Apple Maps can't route in Botswana ("Directions Not Available").
 */
function googleDirections(coords: string) {
  // No origin = the visitor's current location; dir_action=navigate starts turn-by-turn in the app.
  return `https://www.google.com/maps/dir/?api=1&destination=${coords}&dir_action=navigate`
}

/**
 * Phones: Google Maps in the browser won't fill in "your location" on its own, so
 * ask for it here and pass it as the start point. Falls back to the plain link if
 * location is refused or slow. Desktop keeps the new-tab link.
 */
function directionsFromHere(e: React.MouseEvent, coords: string) {
  if (!navigator.geolocation || !window.matchMedia('(pointer: coarse)').matches) return
  // iOS only hands Google Maps links to the app on a real tap, not a delayed redirect; the app finds the location itself.
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // A new tab on iOS shows up blank instead of handing off to Maps, so open in this tab.
  if (iOS) return e.currentTarget.removeAttribute('target')
  e.preventDefault()
  const go = (origin?: string) => {
    window.location.href = origin
      ? `${googleDirections(coords)}&origin=${origin}`
      : googleDirections(coords)
  }
  navigator.geolocation.getCurrentPosition(
    (p) => go(`${p.coords.latitude},${p.coords.longitude}`),
    () => go(),
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
  )
}


/** Days / hours / minutes / seconds to doors, then "Doors open", then "Ended" after `end`. Renders nothing until mounted (prerender-safe). */
function Countdown({ at, end }: { at: number; end: number }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  if (now === null || !Number.isFinite(at)) return null
  if (now >= end) return <p className="tier-countdown">Ended</p>
  const left = Math.floor((at - now) / 1000)
  if (left <= 0) return <p className="tier-countdown is-live">Doors open</p>
  const parts: [number, string][] = [
    [Math.floor(left / 86400), 'd'],
    [Math.floor((left % 86400) / 3600), 'h'],
    [Math.floor((left % 3600) / 60), 'm'],
    [left % 60, 's'],
  ]
  return (
    <p className="tier-countdown" role="timer" aria-label={`Doors in ${parts.map(([n, u]) => n + u).join(' ')}`}>
      {parts.map(([n, u]) => (
        <span key={u}>
          <b>{String(n).padStart(2, '0')}</b>
          {u}
        </span>
      ))}
    </p>
  )
}
