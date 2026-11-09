import { Link, useNavigate } from 'react-router-dom'
import { useCart, type CartItem } from '../cart'
import { MAX_PER_TIER, stockKey, ticketRef, useStock } from '../lib/tickets'

export default function Bag() {
  const { items, remove, setQty } = useCart()
  const navigate = useNavigate()
  const { stock } = useStock()
  const tickets = items.filter((i) => i.kind === 'ticket')
  const hasMerch = items.some((i) => i.kind === 'merch')
  const total = tickets.reduce((n, i) => n + i.price * i.qty, 0)

  const maxFor = (item: CartItem) => {
    if (item.kind !== 'ticket') return MAX_PER_TIER
    const { nightId, tierId } = ticketRef(item)
    // Until stock loads, don't block the buttons; the server re-checks anyway.
    const live = stock?.[stockKey(nightId, tierId)]
    return Math.min(MAX_PER_TIER, live ? live.remaining : MAX_PER_TIER)
  }
  const overStock = tickets.some((i) => i.qty > maxFor(i))

  return (
    <main className="page flow">
      <header className="page-hero">
        <p className="kicker">Bag</p>
        <h1 className="display lg">Your bag</h1>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        {items.length === 0 ? (
          <p>
            Nothing here yet. Grab tickets from the <Link to="/">home page</Link>.
          </p>
        ) : (
          <div className="checkout-wrap">
            <div className="bag-list">
              {items.map((item) => {
                const max = maxFor(item)
                return (
                  <div className="bag-row" key={item.key}>
                    <img src={item.image} alt="" />
                    <div>
                      <strong>{item.name}</strong>
                      <div className="demo-note">{item.detail}</div>
                      <div className="qty">
                        <button
                          type="button"
                          aria-label={`One fewer ${item.name}`}
                          onClick={() => setQty(item.key, item.qty - 1)}
                        >
                          −
                        </button>
                        <span aria-live="polite">{item.qty}</span>
                        <button
                          type="button"
                          aria-label={`One more ${item.name}`}
                          disabled={item.qty >= max}
                          onClick={() => setQty(item.key, item.qty + 1)}
                        >
                          +
                        </button>
                        <button className="link-arrow" onClick={() => remove(item.key)}>
                          Remove
                        </button>
                      </div>
                      {item.qty > max && (
                        <div className="form-error">
                          {max === 0 ? 'Sold out — remove this line.' : `Only ${max} left.`}
                        </div>
                      )}
                    </div>
                    <span>P{item.price * item.qty}</span>
                  </div>
                )
              })}
            </div>
            <div className="checkout-total">
              <span>Total</span>
              <strong>P{total}</strong>
            </div>
            {hasMerch && (
              <p className="demo-note">
                Merch isn’t on sale yet — only the tickets in your bag go through checkout.
              </p>
            )}
            <button
              className="btn"
              disabled={tickets.length === 0 || overStock}
              onClick={() => navigate('/checkout')}
            >
              Checkout
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
