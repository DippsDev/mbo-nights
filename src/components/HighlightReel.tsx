import { Link } from 'react-router-dom'
import { artistsFor, canBuy, getVenue, nights, type Night } from '../data'
import { stubDate } from '../lib/date'
import { stockKey, useStock, type Stock } from '../lib/tickets'

export default function HighlightReel() {
  // One stock call for every ticket; falls back to data.ts until it lands.
  const { stock } = useStock()
  return (
    <section className="highlights">
      <p className="highlights-label">Upcoming</p>
      <div className="highlights-stack">
        {nights.map((night) => (
          <EventTicket key={night.id} night={night} stock={stock} />
        ))}
      </div>
    </section>
  )
}

function EventTicket({ night, stock }: { night: Night; stock: Stock | null }) {
  const venue = getVenue(night.venueId)
  const names = artistsFor(night)
    .map((a) => a.name)
    .join(' · ')
  const { day, month, year, weekday } = stubDate(night.date)
  const href = `/events/${night.id}`
  // Live price/seats from the database when loaded; data.ts otherwise.
  const tiers = night.tiers.map((t) => {
    const live = stock?.[stockKey(night.id, t.id)]
    return {
      id: t.id,
      name: live?.name ?? t.name,
      price: live?.price ?? t.price,
      left: live ? live.remaining : null,
    }
  })
  const from = Math.min(...tiers.map((t) => t.price))
  const allGone = tiers.length > 0 && tiers.every((t) => t.left === 0)
  // A slot with no details yet: no date, lineup, venue or prices, and no event page.
  const soon = Boolean(night.comingSoon)
  const buyable = canBuy(night) && !allGone
  const status = soon ? 'Coming soon' : night.soldOut || allGone ? 'Sold out' : 'On sale soon'
  // Placeholder art is an inline SVG; real posters are files.
  const hasArt = !night.image.startsWith('data:')

  return (
    <article className={`event-ticket${buyable ? '' : ' is-locked'}${soon ? ' is-soon' : ''}`}>
      <div className="event-ticket-stub">
        <span className="event-ticket-weekday">{soon ? 'Date' : weekday}</span>
        <span className="event-ticket-day">{soon ? 'TBA' : day}</span>
        {!soon && (
          <span className="event-ticket-month">
            {month} {year}
          </span>
        )}
        {!soon && <span className="event-ticket-time">{night.time}</span>}
      </div>

      <div className="event-ticket-body">
        <p className="kicker">{soon ? 'Next night · Gaborone' : `${venue?.type} · ${venue?.city}`}</p>
        <h2 className="display">{soon ? night.title : <Link to={href}>{night.title}</Link>}</h2>
        <p className="serif">{night.teaser}</p>
        <p className="event-ticket-meta">
          {soon ? 'Lineup, venue and tickets to be announced' : names}
          {!soon && venue?.name ? ` · ${venue.name}` : ''}
        </p>
        <div className="event-ticket-actions">
          {!buyable ? (
            <span className="btn" aria-disabled>
              {status}
            </span>
          ) : (
            <Link className="btn" to={href}>
              Get tickets
            </Link>
          )}
          {Number.isFinite(from) && <span className="event-ticket-price">From P{from}</span>}
        </div>
      </div>

      <div className={`event-ticket-art${hasArt ? ' has-art' : ''}`}>
        <img src={night.image} alt={night.title} loading="lazy" decoding="async" />
        {!buyable && <span className="event-ticket-flag">{status}</span>}

        {/* Phones: the art area doubles as the ticket face — date and prices. */}
        <div className="event-ticket-face">
          <div className="face-date">
            <span className="face-day">{soon ? 'TBA' : day}</span>
            <span className="face-date-parts">
              <span>{soon ? 'Date' : weekday}</span>
              <span>{soon ? 'to be announced' : `${month} ${year}`}</span>
            </span>
            {!soon && (
              <span className="face-time">
                <ClockIcon />
                {night.time}
              </span>
            )}
          </div>
          <ul className="face-tiers">
            {soon ? (
              <li>
                <span className="face-tier-name">Tickets</span>
                <span className="face-tier-price">TBA</span>
              </li>
            ) : (
              tiers.map((t) => (
                <li key={t.id} className={t.left === 0 ? 'is-out' : undefined}>
                  <span className="face-tier-name">{t.name}</span>
                  <span className="face-tier-price">P{t.price}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </article>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.5V8l2.4 1.6" />
    </svg>
  )
}
