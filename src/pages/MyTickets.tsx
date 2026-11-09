import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { findOrder, TicketError } from '../lib/tickets'

export default function MyTickets() {
  const navigate = useNavigate()
  const [ref, setRef] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const token = await findOrder(ref, phone)
      if (token) navigate(`/order/${token}`)
      else setError('No order matches that reference and number.')
    } catch (err) {
      setError(err instanceof TicketError ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <main className="page flow">
      <header className="page-hero">
        <p className="kicker">Tickets</p>
        <h1 className="display lg">Find my tickets</h1>
        <p className="serif">Use the reference from checkout and the number you booked with.</p>
      </header>
      <section className="section checkout-wrap" style={{ paddingTop: 0 }}>
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>Reference</span>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              placeholder="MBO-XXXX"
              autoCapitalize="characters"
              required
            />
          </label>
          <label className="field">
            <span>Cell number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn" type="submit">
            Find order
          </button>
        </form>
      </section>
    </main>
  )
}
