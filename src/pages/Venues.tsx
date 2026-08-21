import { Link } from 'react-router-dom'
import { PLACEHOLDER_KICKER, venues } from '../data'

export default function Venues() {
  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">{PLACEHOLDER_KICKER}</p>
        <h1 className="display lg">Page title</h1>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="card-grid venues">
          {venues.map((venue) => (
            <Link className="venue-card" key={venue.id} to={`/venues/${venue.id}`}>
              <img src={venue.image} alt={venue.name} />
              <div className="card-meta">
                <span className={`tag ${venue.type === 'restaurant' ? 'copper' : ''}`}>
                  {venue.type}
                </span>
                <h2 className="display md">{venue.name}</h2>
                <p>{venue.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
