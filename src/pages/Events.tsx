import { PLACEHOLDER_KICKER, PLACEHOLDER_SHORT, nights } from '../data'
import NightCard from '../components/NightCard'

export default function Events() {
  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">{PLACEHOLDER_KICKER}</p>
        <h1 className="display lg">Page title</h1>
        <p className="serif">{PLACEHOLDER_SHORT}</p>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="card-grid nights">
          {nights.map((night) => (
            <NightCard key={night.id} night={night} />
          ))}
        </div>
      </section>
    </main>
  )
}
