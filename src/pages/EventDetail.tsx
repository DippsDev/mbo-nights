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
import { stubDate } from '../lib/date'
import { forceMuted, useMutedVideoRef } from '../lib/media'
import { MAX_PER_TIER, stockKey, useStock } from '../lib/tickets'

export default function EventDetail() {
  const { id } = useParams()
  const night = id ? getNight(id) : undefined
  const { add, items, notify } = useCart()
  const { stock, error: stockError } = useStock()
  const [ready, setReady] = useState(false)
  const [videoRef, attachVideo] = useMutedVideoRef()

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
    if (!video || !showClip) return

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
                src={poster}
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
          <p className="kicker">
            {venue?.type} · {venue?.name}
          </p>
          <ul className="lineup">
            {lineup.map((artist) => (
              <li key={artist.id}>
                <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
              </li>
            ))}
          </ul>
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
                      {soon
                        ? 'On sale soon'
                        : loading
                          ? stockError
                            ? 'Can’t load — refresh'
                            : 'Checking…'
                          : gone
                            ? 'Sold out'
                            : `${left} left`}
                    </p>
                  </div>
                  <div className="tier-ticket-buy">
                    <span className="tier-ticket-price">P{live?.price ?? tier.price}</span>
                    <button
                      className="btn"
                      disabled={locked || loading}
                      onClick={() => buy(tier.id)}
                    >
                      {soon ? 'Soon' : gone ? 'Sold out' : 'Add'}
                    </button>
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

    </main>
  )
}
