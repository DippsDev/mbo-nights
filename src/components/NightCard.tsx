import { Link } from 'react-router-dom'
import { artistsFor, getVenue, type Night } from '../data'

export default function NightCard({ night }: { night: Night }) {
  const venue = getVenue(night.venueId)
  const names = artistsFor(night)
    .map((a) => a.name)
    .join(' · ')

  return (
    <Link className="night-card" to={`/events/${night.id}`}>
      <img src={night.image} alt={night.title} />
      <div className="card-meta">
        <span className={`tag ${night.soldOut ? 'sold' : venue?.type === 'restaurant' ? 'copper' : ''}`}>
          {night.soldOut ? 'Sold out' : venue?.type ?? 'Venue type'}
        </span>
        <h3 className="display md">{names}</h3>
        <p>
          {night.date} · {venue?.name} · {night.time}
        </p>
      </div>
    </Link>
  )
}
