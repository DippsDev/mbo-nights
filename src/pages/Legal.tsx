import { Link, Navigate, useParams } from 'react-router-dom'
import { getLegal, LEGAL } from '../legal'

export default function Legal() {
  const { slug = '' } = useParams()
  const doc = getLegal(slug)
  if (!doc) return <Navigate to={`/legal/${LEGAL[0].slug}`} replace />

  return (
    <main className="page flow legal">
      <header className="page-hero">
        <p className="kicker">Legal</p>
        <h1 className="display lg">{doc.title}</h1>
        {doc.updated && <p className="demo-note">Last updated {doc.updated}</p>}
      </header>

      <section className="section" style={{ paddingTop: 0 }}>
        {doc.sections.length === 0 ? (
          <div className="legal-empty">
            <p>We’re finalising this page. Check back soon.</p>
            <Link className="link-arrow" to="/">
              ← Back home
            </Link>
          </div>
        ) : (
          <div className="legal-body">
            {doc.sections.map((s, n) => (
              <section key={s.heading} className="legal-card">
                <span className="legal-num" aria-hidden="true">
                  {String(n + 1).padStart(2, '0')}
                </span>
                {/* Card number replaces any "1. " typed into the heading. */}
                <h2>{s.heading.replace(/^\d+\.\s*/, '')}</h2>
                {s.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
