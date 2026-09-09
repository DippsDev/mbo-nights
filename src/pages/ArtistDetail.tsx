import { Link, Navigate, useParams } from 'react-router-dom'
import { getArtist, nightsForArtist } from '../data'

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
    </main>
  )
}
