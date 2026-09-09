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
          <p className="kicker">Bag</p>
          <h1 className="display lg">You’re in</h1>
          <p className="serif">
            Thanks — your bag is cleared. Checkout is still demo-only, so nothing was charged.
          </p>
          <Link className="btn" to="/">
            Back home
          </Link>
        </header>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">Bag</p>
        <h1 className="display lg">Your bag</h1>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        {items.length === 0 ? (
          <p>
            Nothing here yet. Grab tickets from the{' '}
            <Link to="/">home page</Link> or something from the{' '}
            <Link to="/shop">shop</Link>.
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
                  <span>P{item.price * item.qty}</span>
                </div>
              ))}
            </div>
            <p>
              Total <strong>P{total}</strong>
            </p>
            <p className="demo-note">Demo checkout — no payment is taken yet.</p>
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
