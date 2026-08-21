import { Link } from 'react-router-dom'
import { PLACEHOLDER_KICKER, products } from '../data'

export default function Shop() {
  return (
    <main className="page">
      <header className="page-hero">
        <p className="kicker">{PLACEHOLDER_KICKER}</p>
        <h1 className="display lg">Page title</h1>
      </header>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="card-grid shop">
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
