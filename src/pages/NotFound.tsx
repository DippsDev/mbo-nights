import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="page coming-soon">
      <p className="kicker">404</p>
      <h1 className="display lg">Not found</h1>
      <p className="serif">That page doesn’t exist, or it has moved.</p>
      <Link className="btn" to="/">
        Back home
      </Link>
    </main>
  )
}
