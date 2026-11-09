import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminGate from '../components/AdminGate'
import {
  confirmOrder,
  listOrders,
  rejectOrder,
  salesSummary,
  signOut,
  STATUS_LABEL,
  TicketError,
  type Order,
  type OrderStatus,
  type SalesRow,
} from '../lib/tickets'

type Filter = 'action' | 'all' | OrderStatus

const SITE = (import.meta.env.VITE_SITE_URL as string | undefined) || window.location.origin

const orderLink = (o: Order) => `${SITE.replace(/\/$/, '')}/order/${o.token}`

function whatsappLink(o: Order) {
  const first = o.buyer.name.split(/\s+/)[0]
  const lines = o.lines.map((l) => `• ${l.qty}× ${l.title} ${l.tierName} — ${l.date}, ${l.time}`)
  const text = [
    `Hi ${first}, your payment is confirmed — you're in! 🎟️`,
    '',
    ...lines,
    '',
    `Your tickets (show the QR codes at the door): ${orderLink(o)}`,
    '',
    `Ref ${o.ref} · MBO`,
  ].join('\n')
  return `https://wa.me/267${o.buyer.phone}?text=${encodeURIComponent(text)}`
}

function SendButtons({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false)
  return (
    <>
      <a className="btn" href={whatsappLink(order)} target="_blank" rel="noreferrer">
        Send on WhatsApp
      </a>
      <button
        className="btn ghost"
        onClick={() =>
          void navigator.clipboard
            ?.writeText(orderLink(order))
            .then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            })
            .catch(() => undefined)
        }
      >
        {copied ? 'Copied' : 'Copy ticket link'}
      </button>
    </>
  )
}

const time = (ms?: number) =>
  ms
    ? new Date(ms).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export default function AdminOrdersPage() {
  return (
    <AdminGate>
      <AdminOrders />
    </AdminGate>
  )
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [sales, setSales] = useState<SalesRow[]>([])
  const [filter, setFilter] = useState<Filter>('action')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [justConfirmed, setJustConfirmed] = useState<Order | null>(null)

  const refresh = useCallback(() => {
    Promise.all([listOrders(), salesSummary()])
      .then(([o, s]) => {
        setOrders(o)
        setSales(s)
      })
      .catch((err) =>
        setError(err instanceof TicketError ? err.message : 'Couldn’t load orders.'),
      )
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(id)
  }, [refresh])

  const shown = useMemo(() => {
    const q = query.trim().toUpperCase().replace(/\s/g, '')
    return orders.filter((o) => {
      if (filter === 'action' && o.status !== 'awaiting_confirmation') return false
      if (filter !== 'action' && filter !== 'all' && o.status !== filter) return false
      if (!q) return true
      return (
        o.ref.includes(q) ||
        o.buyer.phone.includes(q) ||
        (o.paymentNote ?? '').replace(/\s/g, '').includes(q) ||
        o.buyer.name.toUpperCase().includes(query.trim().toUpperCase())
      )
    })
  }, [orders, filter, query])

  const act = async (fn: (ref: string) => Promise<Order>, ref: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return
    setError('')
    try {
      const updated = await fn(ref)
      setJustConfirmed(updated.status === 'confirmed' ? updated : null)
    } catch (err) {
      setError(err instanceof TicketError ? err.message : 'That didn’t work.')
    }
    refresh()
  }

  const waiting = orders.filter((o) => o.status === 'awaiting_confirmation').length

  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">Administrator</p>
        <h1 className="display lg">Orders</h1>
        <p className="demo-note">
          Match each Pay2Cell SMS to its reference and amount before confirming. Updates every 30
          seconds.
        </p>
        <div className="admin-actions">
          <button className="btn ghost" onClick={refresh}>
            Refresh
          </button>
          <Link className="btn ghost" to="/admin/scan">
            Door scanner
          </Link>
          <button className="btn ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="admin-sales">
          {sales.map((s) => (
            <div key={`${s.nightId}:${s.tierName}`} className="admin-stat">
              <span className="demo-note">
                {s.title} · {s.tierName}
              </span>
              <strong>
                {s.sold}/{s.capacity}
              </strong>
              {s.held > 0 && <span className="demo-note">{s.held} held</span>}
            </div>
          ))}
        </div>

        <div className="admin-tools">
          <div className="admin-filters" role="tablist">
            {(
              [
                ['action', `To check (${waiting})`],
                ['awaiting_payment', 'Unpaid'],
                ['confirmed', 'Confirmed'],
                ['all', 'All'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={filter === key}
                className={`btn ${filter === key ? '' : 'ghost'}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Search reference, phone or name</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {justConfirmed && (
          <div className="admin-banner" role="status">
            <div>
              <strong>{justConfirmed.ref} confirmed</strong>
              <div className="demo-note">
                {justConfirmed.tickets.length} ticket
                {justConfirmed.tickets.length === 1 ? '' : 's'} issued to {justConfirmed.buyer.name}{' '}
                · {justConfirmed.buyer.phone}. Send them their link:
              </div>
            </div>
            <div className="admin-actions">
              <SendButtons order={justConfirmed} />
              <button className="link-arrow" onClick={() => setJustConfirmed(null)}>
                Done
              </button>
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="demo-note">Nothing here.</p>
        ) : (
          <div className="admin-list">
            {shown.map((o) => (
              <article className="admin-order" key={o.ref}>
                <div className="admin-order-head">
                  <Link to={`/order/${o.token}`}>
                    <strong>{o.ref}</strong>
                  </Link>
                  <span className={`tag status-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                  <strong className="admin-amount">P{o.total}</strong>
                </div>
                <div className="demo-note">
                  {o.buyer.name} · {o.buyer.phone} · {o.buyer.email}
                  {o.paymentNote ? ` · paid from ${o.paymentNote}` : ''}
                </div>
                <div className="demo-note">
                  {o.lines.map((l) => `${l.qty}× ${l.title} ${l.tierName}`).join(', ')}
                </div>
                <div className="demo-note">
                  Ordered {time(o.createdAt)} · reported paid {time(o.reportedPaidAt)}
                </div>
                {o.status === 'confirmed' ? (
                  <>
                    <div className="demo-note">
                      {o.tickets.filter((t) => t.checkedInAt).length}/{o.tickets.length} scanned in
                    </div>
                    <div className="admin-actions">
                      <SendButtons order={o} />
                    </div>
                  </>
                ) : (
                  <div className="admin-actions">
                    <button
                      className="btn"
                      onClick={() =>
                        act(
                          confirmOrder,
                          o.ref,
                          o.status === 'expired' || o.status === 'rejected'
                            ? `${o.ref} is ${STATUS_LABEL[o.status].toLowerCase()}. Confirm late payment of P${o.total}? Only works if seats are still left.`
                            : `Confirm ${o.ref} — P${o.total} received?`,
                        )
                      }
                    >
                      {o.status === 'expired' || o.status === 'rejected'
                        ? 'Confirm late payment'
                        : 'Confirm payment'}
                    </button>
                    {o.status !== 'rejected' && (
                      <button
                        className="btn ghost"
                        onClick={() =>
                          act(rejectOrder, o.ref, `Reject ${o.ref}? Tickets go back on sale.`)
                        }
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
