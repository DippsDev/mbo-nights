import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCart } from '../cart'
import {
  artistsFor,
  getNight,
  getVenue,
  merchForNight,
} from '../data'

export default function EventDetail() {
  const { id } = useParams()
  const night = id ? getNight(id) : undefined
  const { add } = useCart()
  const [note, setNote] = useState('')

  if (!night) return <Navigate to="/events" replace />

  const venue = getVenue(night.venueId)
  const lineup = artistsFor(night)
  const merch = merchForNight(night.id)
  const openTiers = night.tiers.filter((t) => t.remaining > 0)
  const defaultTier = openTiers[0]

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
          <img src={night.image} alt={night.title} />
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
                    {gone ? 'Sold out' : `€${tier.price}`}
                  </button>
                </div>
              )
            })}
          </div>

          {merch.length > 0 && (
            <div>
              <p className="kicker">Related product</p>
              {merch.map((p) => (
                <Link key={p.id} className="link-arrow" to={`/shop/${p.id}`}>
                  {p.name} · €{p.price}
                  {p.soldOut ? ' · sold out' : ''} →
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sticky-buy">
        <span>
          {night.title} · {night.date}
        </span>
        <button
          className="btn"
          disabled={!defaultTier || night.soldOut}
          onClick={() => defaultTier && buy(defaultTier.id)}
        >
          {night.soldOut ? 'Sold out' : 'Get tickets'}
        </button>
      </div>
      {note && <div className="toast">{note}</div>}
    </main>
  )
}
