import { Link } from 'react-router-dom'
import { PLACEHOLDER_KICKER, artists } from '../data'

export default function Artists() {
  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">{PLACEHOLDER_KICKER}</p>
        <h1 className="display lg">Page title</h1>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="card-grid artists">
          {artists.map((artist) => (
            <Link className="artist-card" key={artist.id} to={`/artists/${artist.id}`}>
              <img src={artist.image} alt={artist.name} />
              <div className="card-meta">
                <span className="tag">{artist.role}</span>
                <h2 className="display md">{artist.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
