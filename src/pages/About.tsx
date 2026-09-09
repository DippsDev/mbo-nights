import { Link } from 'react-router-dom'
import { BRAND, BRAND_BODY, BRAND_FULL, BRAND_KICKER, BRAND_TAGLINE } from '../data'

export default function About() {
  return (
    <main className="page">
      <header className="page-hero about-block">
        <p className="kicker">{BRAND_KICKER}</p>
        <h1 className="display lg">{BRAND}</h1>
        <p className="serif">{BRAND_BODY}</p>
        <p className="serif">
          {BRAND_FULL} is a Gaborone live-music project for new acts and the people who show up —
          tickets, rooms, and merch under one roof across Botswana.
        </p>
        <p className="serif">{BRAND_TAGLINE}</p>
        <p>
          <Link className="btn" to="/">
            See upcoming events
          </Link>
        </p>
      </header>
    </main>
  )
}
