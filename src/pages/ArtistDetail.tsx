import { Link, Navigate, useParams } from 'react-router-dom'
import { getArtist, nightsForArtist } from '../data'
import NightCard from '../components/NightCard'

export default function ArtistDetail() {
  const { id } = useParams()
  const artist = id ? getArtist(id) : undefined
  if (!artist) return <Navigate to="/artists" replace />
  const shows = nightsForArtist(artist.id)

  return (
    <main className="page">
      <div className="event-layout">
        <div className="media-frame">
          <img src={artist.image} alt={artist.name} />
        </div>
        <div className="page-hero">
          <p className="kicker">{artist.role}</p>
          <h1 className="display lg">{artist.name}</h1>
          <p className="serif">{artist.bio}</p>
          {shows[0] && (
            <p>
              Next event:{' '}
              <Link to={`/events/${shows[0].id}`}>
                {shows[0].title} · {shows[0].date}
              </Link>
            </p>
          )}
        </div>
      </div>
      {shows.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Section title</h2>
          </div>
          <div className="card-grid nights">
            {shows.map((night) => (
              <NightCard key={night.id} night={night} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
