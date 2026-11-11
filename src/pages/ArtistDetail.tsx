import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getArtist, nightsForArtist } from '../data'
import NightCard from '../components/NightCard'
import { softScrollReveal } from '../lib/motion'

export default function ArtistDetail() {
  const { id } = useParams()
  const artist = id ? getArtist(id) : undefined
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = section.current
    if (!el) return
    return softScrollReveal(el.querySelectorAll('.section-head, .card-grid > *'), el)
  }, [id])

  if (!artist) return <Navigate to="/artists" replace />
  const shows = nightsForArtist(artist.id)

  return (
    <main className="page">
      <div className="event-layout">
        <div className="media-frame artist-media">
          <img src={artist.image} alt={artist.name} />
        </div>
        <div className="page-hero">
          <p className="kicker">{artist.role}</p>
          <h1 className="display lg">{artist.name}</h1>
          <p className="serif">{artist.bio}</p>
        </div>
      </div>
      <section className="section" ref={section}>
        <div className="section-head">
          <h2>Upcoming nights</h2>
        </div>
        {shows.length === 0 ? (
          <p className="demo-note">No nights booked yet — check back soon.</p>
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
