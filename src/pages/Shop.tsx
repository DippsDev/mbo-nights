import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PLACEHOLDER_KICKER, PLACEHOLDER_SHORT, products } from '../data'
import { isNarrow } from '../lib/motion'

export default function Shop() {
  const rail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = rail.current
    if (!scroller) return

    const onWheel = (event: WheelEvent) => {
      if (isNarrow()) return
      if (event.deltaY === 0) return
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
      const max = scroller.scrollWidth - scroller.clientWidth
      if (max <= 0) return
      const next = scroller.scrollLeft + event.deltaY
      const clamped = Math.max(0, Math.min(max, next))
      if (clamped === scroller.scrollLeft) return
      event.preventDefault()
      scroller.scrollLeft = clamped
    }

    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <main className="page shop-page">
      <header className="page-hero">
        <p className="kicker">{PLACEHOLDER_KICKER}</p>
        <h1 className="display lg">Page title</h1>
        <p className="serif">{PLACEHOLDER_SHORT}</p>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="card-grid shop" ref={rail}>
          {products.map((product) => (
            <Link className="product-card" key={product.id} to={`/shop/${product.id}`}>
              <img src={product.image} alt={product.name} />
              <div className="card-meta">
                <span className={`tag ${product.soldOut ? 'sold' : ''}`}>
                  {product.soldOut ? 'Sold out' : product.drop}
                </span>
                <h2 className="display md">{product.name}</h2>
                <p>€{product.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
