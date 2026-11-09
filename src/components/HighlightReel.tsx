import { Link } from 'react-router-dom'
import { artistsFor, getVenue, nights, type Night } from '../data'

export default function HighlightReel() {
  return (
    <section className="highlights">
      <p className="highlights-label">Upcoming</p>
      <div className="highlights-stack">
        {nights.map((night) => (
          <HighlightSlide key={night.id} night={night} />
        ))}
      </div>
    </section>
  )
}

function HighlightSlide({ night }: { night: Night }) {
  const venue = getVenue(night.venueId)
  const names = artistsFor(night)
    .map((a) => a.name)
    .join(' · ')

  return (
    <article className="highlight">
      <img src={night.image} alt={night.title} loading="lazy" decoding="async" />
      <div className="highlight-copy">
        <p className="kicker">
          {venue?.type} · {venue?.city}
        </p>
        <h2 className="display lg">{night.title}</h2>
        <p className="serif">{night.teaser}</p>
        <p>
          {names} · {night.date}
        </p>
        <Link className="btn" to={`/events/${night.id}`}>
          Get tickets
        </Link>
      </div>
    </article>
  )
}
