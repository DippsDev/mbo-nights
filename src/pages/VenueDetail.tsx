import { Navigate, useParams } from 'react-router-dom'
import { getVenue, nightsForVenue } from '../data'
import NightCard from '../components/NightCard'

export default function VenueDetail() {
  const { id } = useParams()
  const venue = id ? getVenue(id) : undefined
  if (!venue) return <Navigate to="/venues" replace />
  const shows = nightsForVenue(venue.id)

  return (
    <main className="page">
      <div className="event-layout">
        <div className="media-frame">
          <img src={venue.image} alt={venue.name} />
        </div>
        <div className="page-hero">
          <p className="kicker">
            {venue.type} · {venue.city}
          </p>
          <h1 className="display lg">{venue.name}</h1>
          <p className="serif">{venue.blurb}</p>
        </div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Section title</h2>
        </div>
        {shows.length === 0 ? (
          <p className="demo-note">Placeholder empty state.</p>
        ) : (
          <div className="card-grid nights">
            {shows.map((night) => (
              <NightCard key={night.id} night={night} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
