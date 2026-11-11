import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BRAND_KICKER, artists, nightsForArtist } from '../data'
import { softScrollReveal } from '../lib/motion'

export default function Artists() {
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = section.current
    if (!el) return
    return softScrollReveal(el.querySelectorAll('.card-grid > *'), el)
  }, [])

  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">{BRAND_KICKER}</p>
        <h1 className="display lg">Artists</h1>
        <p className="serif">The acts playing MBO nights across Gaborone.</p>
      </header>
      <section className="section" style={{ paddingTop: 0 }} ref={section}>
        <div className={`card-grid artists${artists.length === 1 ? ' solo' : ''}`}>
          {artists.map((artist) => {
            const next = nightsForArtist(artist.id)[0]
            return (
              <Link className="artist-card" key={artist.id} to={`/artists/${artist.id}`}>
                <img src={artist.image} alt={artist.name} loading="lazy" decoding="async" />
                <div className="card-meta">
                  <span className="tag">{next ? `Next · ${next.date}` : artist.role}</span>
                  <h2 className="display md">{artist.name}</h2>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
