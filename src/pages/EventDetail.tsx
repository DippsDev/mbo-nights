import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCart } from '../cart'
import {
  artistsFor,
  getNight,
  getVenue,
  merchForNight,
} from '../data'
import { isNarrow } from '../lib/motion'

export default function EventDetail() {
  const { id } = useParams()
  const night = id ? getNight(id) : undefined
  const { add } = useCart()
  const [note, setNote] = useState('')
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? isNarrow() : false,
  )
  const videoRef = useRef<HTMLVideoElement>(null)

  const clip = night?.clips[0]
  const showClip = Boolean(clip && mobile)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 799px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !showClip) return

    const play = () => {
      void video.play().catch(() => undefined)
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') play()
    }

    if (video.readyState >= 2) play()
    else video.addEventListener('canplay', play, { once: true })

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', play)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pageshow', play)
    }
  }, [showClip])

  if (!night) return <Navigate to="/" replace />

  const venue = getVenue(night.venueId)
  const lineup = artistsFor(night)
  const merch = merchForNight(night.id)

  const buy = (tierId: string) => {
    const tier = night.tiers.find((t) => t.id === tierId)
    if (!tier || night.soldOut || tier.remaining <= 0) return
    add({
      key: `ticket:${night.id}:${tier.id}`,
      kind: 'ticket',
      refId: night.id,
      name: night.title,
      detail: `${tier.name} · ${night.date} · ${venue?.name}`,
      price: tier.price,
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
            <video
              ref={videoRef}
              src={clip}
              poster={night.image}
              muted
              playsInline
              loop
              preload="auto"
              aria-label={`${night.title} preview`}
            />
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
              const gone = night.soldOut || tier.remaining <= 0
              return (
                <div className="tier" key={tier.id}>
                  <div>
                    <strong>{tier.name}</strong>
                    <div className="demo-note">
                      {gone ? 'Gone' : `${tier.remaining} left`}
                    </div>
                  </div>
                  <button className="btn" disabled={gone} onClick={() => buy(tier.id)}>
                    {gone ? 'Sold out' : `P${tier.price}`}
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
