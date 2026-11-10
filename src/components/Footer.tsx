import { Link } from 'react-router-dom'
import { BRAND_FULL, CHANNELS, nextOpenNight } from '../data'
import { LEGAL } from '../legal'
import { reducedMotion } from '../lib/motion'
import { TICKETS_ENABLED } from '../lib/flags'

const PAGES = [
  ['/', 'Home'],
  ['/artists', 'Artists'],
  ['/shop', 'Shop'],
  ['/about', 'About'],
] as const

export default function Footer() {
  const next = nextOpenNight()
  const channels = CHANNELS.filter((c) => c.href)

  const toTop = () =>
    window.scrollTo({ top: 0, left: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })

  return (
    <footer className="site-foot">
      <div className="foot-grid">
        <div className="foot-brand">
          <button type="button" className="foot-logo" onClick={toTop}>
            MBO
          </button>
          <p>
            {BRAND_FULL} — a Botswana-born event collective built for the youth, by the youth.
            Live music, culture and nights people actually remember.
          </p>
          <span className="foot-place">Gaborone · Botswana</span>
        </div>

        <nav className="foot-col" aria-label="Pages">
          <p className="foot-head">Explore</p>
          <ul>
            {PAGES.map(([to, label]) => (
              <li key={to}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="foot-col" aria-label="Tickets">
          <p className="foot-head">Tickets</p>
          <ul>
            {next && (
              <li>
                <Link to={`/events/${next.id}`}>
                  {next.title} · {next.date}
                </Link>
              </li>
            )}
            {TICKETS_ENABLED && (
              <li>
                <Link to="/tickets">Find my tickets</Link>
              </li>
            )}
            <li>
              <Link to="/bag">Bag</Link>
            </li>
          </ul>
        </nav>

        <nav className="foot-col" aria-label="Legal">
          <p className="foot-head">Legal</p>
          <ul>
            {LEGAL.map((d) => (
              <li key={d.slug}>
                <Link to={`/legal/${d.slug}`}>{d.title}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {channels.length > 0 && (
          <div className="foot-col">
            <p className="foot-head">Channels</p>
            <ul>
              {channels.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    {...(c.href.startsWith('mailto:')
                      ? {}
                      : { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {c.label}
                    <span aria-hidden className="foot-out">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="foot-base">
        <span>
          © {new Date().getFullYear()} MBO Nights. All rights reserved.
        </span>
        <button type="button" className="foot-top" onClick={toTop}>
          Back to top <span aria-hidden>↑</span>
        </button>
      </div>
    </footer>
  )
}
