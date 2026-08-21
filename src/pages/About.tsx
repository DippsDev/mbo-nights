import { Link } from 'react-router-dom'
import { PLACEHOLDER_BODY, PLACEHOLDER_KICKER } from '../data'

export default function About() {
  return (
    <main className="page">
      <header className="page-hero about-block">
        <p className="kicker">{PLACEHOLDER_KICKER}</p>
        <h1 className="display lg">Brand name</h1>
        <p>{PLACEHOLDER_BODY}</p>
        <p>{PLACEHOLDER_BODY}</p>
        <p>
          <Link className="btn" to="/events">
            Primary CTA
          </Link>
        </p>
      </header>
    </main>
  )
}
