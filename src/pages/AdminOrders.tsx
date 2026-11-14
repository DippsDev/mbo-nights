import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminGate from '../components/AdminGate'
import {
  confirmOrder,
  listOrders,
  rejectOrder,
  sendInvoice,
  signOut,
  STATUS_LABEL,
  TicketError,
  type Order,
  type OrderStatus,
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
  const [sentAt, setSentAt] = useState(order.invoiceSentAt)
  const [sending, setSending] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')

  const invoice = async () => {
    setSending(true)
    setInvoiceError('')
    try {
      setSentAt((await sendInvoice(order.ref)).invoiceSentAt ?? Date.now())
    } catch (err) {
      setInvoiceError(err instanceof TicketError ? err.message : 'Couldn’t send the invoice.')
    }
    setSending(false)
  }

  return (
    <>
      <a className="btn" href={whatsappLink(order)} target="_blank" rel="noreferrer">
        Send on WhatsApp
      </a>
      <button
        className="btn"
        onClick={() => void invoice()}
        disabled={sending}
        title={`Email the invoice to ${order.buyer.email}`}
      >
        {sending ? 'Sending…' : sentAt ? 'Resend invoice' : 'Send invoice'}
      </button>
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
      {(sentAt || invoiceError) && (
        <p className={invoiceError ? 'form-error admin-invoice-note' : 'demo-note admin-invoice-note'} role="status">
          {invoiceError || `Invoice emailed to ${order.buyer.email} · ${time(sentAt)}`}
        </p>
      )}
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

/** QR code glyph: three finder squares plus a few data blocks. */
function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Z"
      />
      <path d="M6 6h2v2H6zM16 6h2v2h-2zM6 16h2v2H6zM13 13h3v3h-3zM18 13h3v3h-3zM16 16h2v2h-2zM13 18h3v3h-3zM18 18h3v3h-3z" />
    </svg>
  )
}

export default function AdminOrdersPage() {
  return (
    <AdminGate>
      <AdminOrders />
    </AdminGate>
  )
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<Filter>('action')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [justConfirmed, setJustConfirmed] = useState<Order | null>(null)

  const refresh = useCallback(() => {
    listOrders()
      .then(setOrders)
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

  // Which order is showing its "Are you sure?" row, and for which action.
  const [asking, setAsking] = useState<{ ref: string; kind: 'confirm' | 'reject' } | null>(null)
  const [busy, setBusy] = useState(false)

  const act = async (fn: (ref: string) => Promise<Order>, ref: string) => {
    setBusy(true)
    setError('')
    try {
      const updated = await fn(ref)
      setJustConfirmed(updated.status === 'confirmed' ? updated : null)
    } catch (err) {
      setError(err instanceof TicketError ? err.message : 'That didn’t work.')
    }
    setBusy(false)
    setAsking(null)
    refresh()
  }

  const waiting = orders.filter((o) => o.status === 'awaiting_confirmation').length

  return (
    <main className="page shop-page orders-page">
      <header className="page-hero admin-hero">
        <div className="admin-hero-top">
          <div>
            <p className="kicker">Administrator</p>
            <h1 className="display lg">Orders</h1>
          </div>
          <Link className="btn admin-scan" to="/admin/scan" aria-label="Door scanner">
            <ScanIcon />
            <span>Door scanner</span>
          </Link>
        </div>
        <p className="serif">
          Match each payment SMS or bank notification to its reference and amount before confirming. Updates every 30
          seconds.
        </p>
        <div className="admin-actions admin-bar-row">
          <button className="btn ghost" onClick={refresh}>
            Refresh
          </button>
          <Link className="btn ghost" to="/admin/sales">
            Sales
          </Link>
          <button className="btn ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <section className="section shop-section orders-section">
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
          <div className="product-boxes admin-list">
            {shown.map((o) => (
              <article className="product-box admin-order" key={o.ref}>
                <div className="admin-order-head">
                  <Link to={`/order/${o.token}`}>
                    <strong>{o.ref}</strong>
                  </Link>
                  <span className={`tag status-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                  <strong className="admin-amount">P{o.total}</strong>
                </div>
                <div className="demo-note">
                  {o.buyer.name} · {o.buyer.phone} · {o.buyer.email}
                  {o.paymentNote ? ` · paid via ${o.paymentNote}` : ''}
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
                ) : asking?.ref === o.ref ? (
                  // In-card "are you sure?" — replaces the browser's confirm() box.
                  <div
                    className={`admin-confirm${asking.kind === 'reject' ? ' is-reject' : ''}`}
                    role="alertdialog"
                    aria-label={asking.kind === 'confirm' ? 'Confirm payment' : 'Reject order'}
                  >
                    <p>
                      {asking.kind === 'reject' ? (
                        <>
                          Reject <strong>{o.ref}</strong>? Its tickets go back on sale.
                        </>
                      ) : o.status === 'expired' || o.status === 'rejected' ? (
                        <>
                          <strong>{o.ref}</strong> is {STATUS_LABEL[o.status].toLowerCase()}. Confirm a
                          late payment of <strong>P{o.total}</strong>? Only works if seats are still left.
                        </>
                      ) : (
                        <>
                          Have you received <strong>P{o.total}</strong> for <strong>{o.ref}</strong>?
                          This issues the tickets.
                        </>
                      )}
                    </p>
                    <div className="admin-actions">
                      <button
                        className={asking.kind === 'reject' ? 'btn ghost' : 'btn'}
                        disabled={busy}
                        autoFocus
                        onClick={() => act(asking.kind === 'confirm' ? confirmOrder : rejectOrder, o.ref)}
                      >
                        {busy ? 'Working…' : asking.kind === 'confirm' ? 'Yes, confirm' : 'Yes, reject'}
                      </button>
                      <button
                        className="link-arrow admin-cancel"
                        disabled={busy}
                        onClick={() => setAsking(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-actions">
                    <button className="btn" onClick={() => setAsking({ ref: o.ref, kind: 'confirm' })}>
                      {o.status === 'expired' || o.status === 'rejected'
                        ? 'Confirm late payment'
                        : 'Confirm payment'}
                    </button>
                    {o.status !== 'rejected' && (
                      <button
                        className="btn ghost"
                        onClick={() => setAsking({ ref: o.ref, kind: 'reject' })}
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
