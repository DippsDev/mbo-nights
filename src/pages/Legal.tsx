import { Link, Navigate, NavLink, useParams } from 'react-router-dom'
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
        <nav className="legal-tabs" aria-label="Legal pages">
          {LEGAL.map((d) => (
            <NavLink key={d.slug} to={`/legal/${d.slug}`}>
              {d.title}
            </NavLink>
          ))}
        </nav>

        {doc.sections.length === 0 ? (
          <div className="legal-empty">
            <p>We’re finalising this page. Check back soon.</p>
            <Link className="link-arrow" to="/">
              ← Back home
            </Link>
          </div>
        ) : (
          <div className="legal-body">
            {doc.sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
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
