import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminGate from '../components/AdminGate'
import { salesSummary, TicketError, type SalesRow } from '../lib/tickets'

export default function AdminSalesPage() {
  return (
    <AdminGate>
      <AdminSales />
    </AdminGate>
  )
}

/** Sales rows grouped per night, in the order the database returns them. */
function byNight(rows: SalesRow[]) {
  const map = new Map<string, { title: string; tiers: SalesRow[] }>()
  for (const r of rows) {
    const night = map.get(r.nightId) ?? { title: r.title, tiers: [] }
    night.tiers.push(r)
    map.set(r.nightId, night)
  }
  return [...map.entries()].map(([id, n]) => ({ id, ...n }))
}

const pct = (n: number, of: number) => `${Math.min(100, (n / Math.max(1, of)) * 100)}%`

function AdminSales() {
  const [sales, setSales] = useState<SalesRow[] | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    salesSummary()
      .then((s) => {
        setSales(s)
        setError('')
      })
      .catch((err) => setError(err instanceof TicketError ? err.message : 'Couldn’t load sales.'))
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(id)
  }, [refresh])

  const rows = sales ?? []
  const sold = rows.reduce((n, r) => n + r.sold, 0)
  const held = rows.reduce((n, r) => n + r.held, 0)
  const capacity = rows.reduce((n, r) => n + r.capacity, 0)

  return (
    <main className="page shop-page sales-page">
      <header className="page-hero">
        <p className="kicker">Administrator</p>
        <h1 className="display lg">Sales</h1>
        <p className="serif">Confirmed tickets per night. Updates every 30 seconds.</p>
        <div className="admin-actions">
          <Link className="btn ghost" to="/admin/orders">
            ← Orders
          </Link>
          <button className="btn ghost" onClick={refresh}>
            Refresh
          </button>
        </div>
      </header>

      <section className="section shop-section sales">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="sales-totals">
          <div>
            <strong>{sold}</strong>
            <span>Sold</span>
          </div>
          <div>
            <strong>{held}</strong>
            <span>Held, unpaid</span>
          </div>
          <div>
            <strong>{Math.max(0, capacity - sold - held)}</strong>
            <span>Still available</span>
          </div>
        </div>

        <div className="product-boxes">
          {byNight(rows).map((n) => {
            const nSold = n.tiers.reduce((x, t) => x + t.sold, 0)
            const nCap = n.tiers.reduce((x, t) => x + t.capacity, 0)
            return (
              <article className="product-box sales-night" key={n.id}>
                <div className="product-box-body">
                  <p className="kicker">
                    {nSold} of {nCap} sold
                  </p>
                  <h2 className="display">{n.title}</h2>
                  {n.tiers.map((t) => (
                    <div className="sales-tier" key={t.tierName}>
                      <span className="sales-tier-name">{t.tierName}</span>
                      <span className="sales-bar" aria-hidden>
                        <span style={{ width: pct(t.sold, t.capacity) }} />
                        <span className="is-held" style={{ width: pct(t.held, t.capacity) }} />
                      </span>
                      <span className="sales-tier-count">
                        {t.sold}
                        <small>/{t.capacity}</small>
                        {t.held > 0 && <em>{t.held} held</em>}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
