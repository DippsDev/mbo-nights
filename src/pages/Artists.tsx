import { BRAND_KICKER, artists } from '../data'

// Only acts with a real photo get a card; placeholders (data: URIs) stay off this page.
const pictured = artists.filter((a) => !a.image.startsWith('data:'))

export default function Artists() {
  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">{BRAND_KICKER}</p>
        <h1 className="display lg">Artists</h1>
        <p className="serif">The acts playing MBO nights across Gaborone.</p>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className={`card-grid artists${pictured.length === 1 ? ' solo' : ''}`}>
          {pictured.map((artist, i) => {
            // The first row is on screen straight away; only later cards wait.
            const eager = i < 3
            return (
              <div className="artist-card" key={artist.id}>
                <img
                  src={artist.image}
                  alt={artist.name}
                  style={artist.imagePosition ? { objectPosition: artist.imagePosition } : undefined}
                  loading={eager ? 'eager' : 'lazy'}
                  fetchPriority={eager ? 'high' : 'auto'}
                  decoding="async"
                />
                <div className="card-meta">
                  <span className="tag">{artist.role}</span>
                  <h2 className="display md">{artist.name}</h2>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
