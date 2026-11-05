import { Link } from 'react-router-dom'

export default function ComingSoon({
  label,
  tickets = false,
}: {
  label: string
  tickets?: boolean
}) {
  return (
    <main className="page coming-soon">
      <p className="kicker">Coming soon</p>
      <h1 className="display lg">{label}</h1>
      <p className="serif">
        {tickets
          ? 'Ticket sales open soon. The lineup and doors are still being set.'
          : 'This page opens soon. It is still being built.'}
      </p>
      <Link className="btn" to="/">
        Back home
      </Link>
    </main>
  )
}
