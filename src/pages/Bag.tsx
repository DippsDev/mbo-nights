import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../cart'

export default function Bag() {
  const { items, remove, total, clear } = useCart()
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <main className="page">
        <header className="page-hero about-block">
          <p className="kicker">Placeholder</p>
          <h1 className="display lg">Confirmation title</h1>
          <p className="serif">Placeholder confirmation. Nothing was charged.</p>
          <Link className="btn" to="/events">
            Back to nights
          </Link>
        </header>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">Placeholder</p>
        <h1 className="display lg">Page title</h1>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        {items.length === 0 ? (
          <p>
            Placeholder empty state.{' '}
            <Link to="/events">Events</Link> or <Link to="/shop">shop</Link>.
          </p>
        ) : (
          <>
            <div className="bag-list">
              {items.map((item) => (
                <div className="bag-row" key={item.key}>
                  <img src={item.image} alt="" />
                  <div>
                    <strong>{item.name}</strong>
                    <div className="demo-note">
                      {item.detail} · ×{item.qty}
                    </div>
                    <button className="link-arrow" onClick={() => remove(item.key)}>
                      Remove
                    </button>
                  </div>
                  <span>€{item.price * item.qty}</span>
                </div>
              ))}
            </div>
            <p>
              Total <strong>€{total}</strong>
            </p>
            <p className="demo-note">Placeholder checkout. Demo, no payment taken.</p>
            <button
              className="btn"
              onClick={() => {
                clear()
                setDone(true)
              }}
            >
              Confirm
            </button>
          </>
        )}
      </section>
    </main>
  )
}
