import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCart } from '../cart'
import { getNight, getProduct } from '../data'

export default function Product() {
  const { id } = useParams()
  const product = id ? getProduct(id) : undefined
  const { add } = useCart()
  const [note, setNote] = useState('')
  if (!product) return <Navigate to="/shop" replace />
  const night = product.nightId ? getNight(product.nightId) : undefined

  const buy = () => {
    if (product.soldOut) return
    add({
      key: `merch:${product.id}`,
      kind: 'merch',
      refId: product.id,
      name: product.name,
      detail: product.drop,
      price: product.price,
      image: product.image,
    })
    setNote('Added to bag')
    window.setTimeout(() => setNote(''), 1800)
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
          <p className="serif">€{product.price}</p>
          {night && (
            <p>
              Tied to{' '}
              <Link to={`/events/${night.id}`}>
                {night.title} · {night.date}
              </Link>
            </p>
          )}
          <button className="btn" disabled={product.soldOut} onClick={buy}>
            {product.soldOut ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </div>
      {note && <div className="toast">{note}</div>}
    </main>
  )
}
