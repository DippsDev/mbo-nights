import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCart } from '../cart'
import {
  artistsFor,
  getNight,
  getVenue,
  merchForNight,
} from '../data'
import { isNarrow } from '../lib/motion'
import { forceMuted, useMutedVideoRef } from '../lib/media'
import { MAX_PER_TIER, stockKey, useStock } from '../lib/tickets'

export default function EventDetail() {
  const { id } = useParams()
  const night = id ? getNight(id) : undefined
  const { add, items } = useCart()
  const { stock, error: stockError } = useStock()
  const [note, setNote] = useState('')
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? isNarrow() : false,
  )
  const [ready, setReady] = useState(false)
  const [videoRef, attachVideo] = useMutedVideoRef()

  const clip = night?.clips[0]
  const showClip = Boolean(clip && mobile)
  const poster = clip
    ? clip.replace(/\.mp4$/i, '.jpg')
    : night?.image || ''

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 799px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Warm cache as soon as this night has a mobile clip (even before play).
  useEffect(() => {
    if (!clip || !mobile) return
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
  }, [clip, mobile])

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

  if (!night) return <Navigate to="/" replace />

  const venue = getVenue(night.venueId)
  const lineup = artistsFor(night)
  const merch = merchForNight(night.id)

  const buy = (tierId: string) => {
    const tier = night.tiers.find((t) => t.id === tierId)
    const live = stock?.[stockKey(night.id, tierId)]
    if (!tier || !live || night.soldOut) return
    const inBag = items.find((i) => i.key === `ticket:${night.id}:${tier.id}`)?.qty ?? 0
    const max = Math.min(MAX_PER_TIER, live.remaining)
    if (inBag >= max) {
      setNote(max === 0 ? 'Sold out' : `Max ${max} in your bag`)
      window.setTimeout(() => setNote(''), 1800)
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
    setNote(`${tier.name} added`)
    window.setTimeout(() => setNote(''), 1800)
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
              />
              <video
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

          <div className="tiers">
            {night.tiers.map((tier) => {
              const live = stock?.[stockKey(night.id, tier.id)]
              const left = live?.remaining ?? 0
              const gone = Boolean(live) && (night.soldOut || left <= 0)
              const loading = !live
              return (
                <div className="tier" key={tier.id}>
                  <div>
                    <strong>{tier.name}</strong>
                    <div className="demo-note">
                      {loading ? (stockError ? 'Can’t load — refresh' : 'Checking…') : gone ? 'Gone' : `${left} left`}
                    </div>
                  </div>
                  <button className="btn" disabled={gone || loading} onClick={() => buy(tier.id)}>
                    {gone ? 'Sold out' : `P${live?.price ?? tier.price}`}
                  </button>
                </div>
              )
            })}
          </div>

          {merch.length > 0 && (
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

      {note && <div className="toast">{note}</div>}
    </main>
  )
}
