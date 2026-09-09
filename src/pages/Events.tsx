import { BRAND_KICKER, nights } from '../data'
import NightCard from '../components/NightCard'

export default function Events() {
  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">{BRAND_KICKER}</p>
        <h1 className="display lg">Nights</h1>
        <p className="serif">Upcoming tickets, lineups, and doors.</p>
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
