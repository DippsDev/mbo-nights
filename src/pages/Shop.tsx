import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BRAND_KICKER, products, type Product } from '../data'
import { softScrollReveal } from '../lib/motion'

export default function Shop() {
  const grid = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = grid.current
    if (!el) return
    return softScrollReveal(el.querySelectorAll('.product-box'), el)
  }, [])

  return (
    <main className="page shop-page">
      <header className="page-hero">
        <p className="kicker">{BRAND_KICKER}</p>
        <h1 className="display lg">Shop</h1>
        <p className="serif">Tees, prints, and night drops while they last.</p>
      </header>
      <section className="section shop-section">
        <div className="product-boxes" ref={grid}>
          {products.map((product) => (
            <ProductBox key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  )
}

/** A merch box; coming-soon slots borrow the homepage tickets' hatched, muted look. */
function ProductBox({ product }: { product: Product }) {
  const soon = Boolean(product.comingSoon)
  const href = `/shop/${product.id}`
  const status = soon ? 'Coming soon' : product.soldOut ? 'Sold out' : 'View'
  const locked = soon || product.soldOut

  return (
    <article className={`product-box${locked ? ' is-locked' : ''}${soon ? ' is-soon' : ''}`}>
      <div className="product-box-art">
        <img src={product.image} alt={soon ? 'Merch coming soon' : product.name} loading="lazy" decoding="async" />
        {locked && <span className="event-ticket-flag">{status}</span>}
      </div>
      <div className="product-box-body">
        <p className="kicker">{product.drop}</p>
        <h2 className="display">{soon ? product.name : <Link to={href}>{product.name}</Link>}</h2>
        {product.teaser && <p className="serif">{product.teaser}</p>}
        <p className="product-box-meta">{soon ? 'Design, price and release date TBA' : `P${product.price}`}</p>
        {locked ? (
          <span className="btn" aria-disabled>
            {status}
          </span>
        ) : (
          <Link className="btn" to={href}>
            {status}
          </Link>
        )}
      </div>
    </article>
  )
}
