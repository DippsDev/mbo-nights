import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import TicketPass from '../components/TicketPass'
import {
  cancelOrder,
  getOrder,
  PAY2CELL,
  reportPaid,
  STATUS_LABEL,
  TicketError,
  type Order as OrderT,
} from '../lib/tickets'

function useCountdown(until: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const ms = Math.max(0, until - now)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return { done: ms === 0, label: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => undefined)
  }
  return (
    <div className="pay-row">
      <span className="kicker">{label}</span>
      <strong>{value}</strong>
      <button type="button" className="link-arrow" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function AwaitingPayment({ order, refresh }: { order: OrderT; refresh: () => void }) {
  const { done, label } = useCountdown(order.expiresAt)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (done) refresh()
  }, [done, refresh])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await reportPaid(order.token, note)
      refresh()
    } catch (err) {
      setError(err instanceof TicketError ? err.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <>
      <header className="page-hero">
        <p className="kicker">Checkout · step 2 of 2</p>
        <h1 className="display lg">Pay with Pay2Cell</h1>
        <p className="serif">
          Send the exact amount with Pay2Cell, and put your reference in the message so we can
          match it.
        </p>
      </header>
      <section className="section checkout-wrap" style={{ paddingTop: 0 }}>
        <div className="pay-box">
          <CopyRow label="Send to" value={PAY2CELL.number} />
          <CopyRow label="Name" value={PAY2CELL.name} />
          <CopyRow label="Amount" value={`P${order.total}`} />
          <CopyRow label="Reference" value={order.ref} />
        </div>
        <p className="demo-note">
          Held for you for <strong className="countdown">{label}</strong>. After that the tickets go
          back on sale.
        </p>

        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>Paid from a different number? (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              inputMode="tel"
              placeholder="Sender's cell number"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn" type="submit" disabled={busy || done}>
            I’ve paid
          </button>
          <button
            type="button"
            className="link-arrow"
            onClick={() => void cancelOrder(order.token).then(refresh, refresh)}
          >
            Cancel order
          </button>
        </form>
        <OrderLines order={order} />
      </section>
    </>
  )
}

function OrderLines({ order }: { order: OrderT }) {
  return (
    <div className="order-summary">
      {order.lines.map((l) => (
        <div className="summary-row" key={`${l.nightId}:${l.tierId}`}>
          <span>
            {l.qty} × {l.title} {l.tierName}
            <span className="demo-note">
              {' '}
              · {l.date} · {l.venue}
            </span>
          </span>
          <span>P{l.unitPrice * l.qty}</span>
        </div>
      ))}
      <div className="checkout-total">
        <span>Total</span>
        <strong>P{order.total}</strong>
      </div>
    </div>
  )
}

export default function Order() {
  const { token = '' } = useParams()
  const [order, setOrder] = useState<OrderT | null | undefined>(undefined)
  const [loadError, setLoadError] = useState(false)

  const refresh = useCallback(() => {
    getOrder(token)
      .then((o) => {
        setOrder(o ?? null)
        setLoadError(false)
      })
      .catch(() => setLoadError(true))
  }, [token])

  useEffect(() => {
    refresh()
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  // While we're checking their payment, quietly look for the confirmation.
  const checking = order?.status === 'awaiting_confirmation'
  useEffect(() => {
    if (!checking) return
    const id = window.setInterval(refresh, 20_000)
    return () => window.clearInterval(id)
  }, [checking, refresh])

  if (order === undefined) {
    return (
      <main className="page flow">
        {loadError && (
          <header className="page-hero">
            <p className="kicker">Order</p>
            <h1 className="display lg">Can’t load</h1>
            <p className="serif">Check your connection, then try again.</p>
            <button className="btn" onClick={refresh}>
              Try again
            </button>
          </header>
        )}
      </main>
    )
  }

  if (order === null) {
    return (
      <main className="page coming-soon">
        <p className="kicker">Order</p>
        <h1 className="display lg">Not found</h1>
        <p className="serif">We couldn’t find that order. Look it up with your reference and cell number.</p>
        <Link className="btn" to="/tickets">
          Find my tickets
        </Link>
      </main>
    )
  }

  if (order.status === 'awaiting_payment') {
    return (
      <main className="page flow">
        <AwaitingPayment order={order} refresh={refresh} />
      </main>
    )
  }

  if (order.status === 'confirmed') {
    return (
      <main className="page flow">
        <header className="page-hero">
          <p className="kicker">{order.ref} · Confirmed</p>
          <h1 className="display lg">You’re in</h1>
          <p className="serif">
            Show these codes at the door. Each one scans once — don’t share screenshots.
          </p>
        </header>
        <section className="section passes" style={{ paddingTop: 0 }}>
          {order.tickets.map((t, i) => (
            <TicketPass
              key={t.code}
              ticket={t}
              holder={order.buyer.name}
              index={i}
              count={order.tickets.length}
            />
          ))}
          <Link className="btn" to="/">
            Back home
          </Link>
        </section>
      </main>
    )
  }

  const copy: Record<string, { title: string; body: string }> = {
    awaiting_confirmation: {
      title: 'Checking payment',
      body: 'Thanks — we’re matching your Pay2Cell payment. Your tickets appear on this page once it’s confirmed, usually within a few hours. Bookmark this page, or find it later with your reference and cell number.',
    },
    rejected: {
      title: 'Payment not found',
      body: 'We couldn’t match a payment to this order. If you did pay, contact us with your reference and the number you paid from.',
    },
    expired: {
      title: 'Expired',
      body: 'This reservation wasn’t paid in time, so the tickets went back on sale.',
    },
  }
  const c = copy[order.status]

  return (
    <main className="page flow">
      <header className="page-hero">
        <p className="kicker">
          {order.ref} · {STATUS_LABEL[order.status]}
        </p>
        <h1 className="display lg">{c.title}</h1>
        <p className="serif">{c.body}</p>
      </header>
      <section className="section checkout-wrap" style={{ paddingTop: 0 }}>
        <OrderLines order={order} />
        <Link className="btn" to="/">
          Back home
        </Link>
      </section>
    </main>
  )
}
