import { Link, Navigate, useParams } from 'react-router-dom'
import { useCart } from '../cart'
import { getNight, getProduct } from '../data'

/** Flip to true once checkout and the orders table can take merch. */
const MERCH_ON_SALE = false

export default function Product() {
  const { id } = useParams()
  const product = id ? getProduct(id) : undefined
  const { add } = useCart()
  // Placeholder slots have no page of their own yet.
  if (!product || product.comingSoon) return <Navigate to="/shop" replace />
  const linked = product.nightId ? getNight(product.nightId) : undefined
  // Placeholder nights have no event page to point at yet.
  const night = linked && !linked.comingSoon ? linked : undefined

  const buy = () => {
    if (product.soldOut || !MERCH_ON_SALE) return
    add({
      key: `merch:${product.id}`,
      kind: 'merch',
      refId: product.id,
      name: product.name,
      detail: product.drop,
      price: product.price,
      image: product.image,
    })
  }

  return (
    <main className="page">
      <div className="event-layout">
        <div className="media-frame">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="page-hero">
          <p className="kicker">{product.drop}</p>
          <h1 className="display lg">{product.name}</h1>
          <p className="serif">P{product.price}</p>
          {night && (
            <p>
              Tied to{' '}
              <Link to={`/events/${night.id}`}>
                {night.title} · {night.date}
              </Link>
            </p>
          )}
          {/* Checkout only handles tickets so far; merch is browse-only until it does. */}
          <button className="btn" disabled={product.soldOut || !MERCH_ON_SALE} onClick={buy}>
            {product.soldOut ? 'Sold out' : MERCH_ON_SALE ? 'Add to bag' : 'Coming soon'}
          </button>
        </div>
      </div>
    </main>
  )
}
