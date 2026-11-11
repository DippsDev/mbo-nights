import { Suspense, useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../cart'
import { reducedMotion } from '../lib/motion'
import { useSound } from '../sound'
import BagIcon from './BagIcon'
import BagSlip from './BagSlip'
import Cursor from './Cursor'
import Footer from './Footer'
import Intro from './Intro'
import Menu from './Menu'

export default function Layout() {
  const { count } = useCart()
  const { on, toggle } = useSound()
  const location = useLocation()
  const home = location.pathname === '/'
  const [open, setOpen] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const [overHero, setOverHero] = useState(true)
  const close = useCallback(() => setOpen(false), [])

  // Nudge the bag icon whenever something new lands in it.
  const [bumped, setBumped] = useState(false)
  const [seenCount, setSeenCount] = useState(count)
  if (count !== seenCount) {
    setSeenCount(count)
    if (count > seenCount) setBumped(true)
  }
  useEffect(() => {
    if (!bumped) return
    const t = window.setTimeout(() => setBumped(false), 700)
    return () => window.clearTimeout(t)
  }, [bumped, seenCount])

  const goHomeTop = (event: MouseEvent<HTMLAnchorElement>) => {
    close()
    if (location.pathname === '/') event.preventDefault()
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    })
  }

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
    // Clear any leftover menu scroll-lock (HMR / interrupted close).
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
  }, [location.pathname])

  useEffect(() => {
    // Measure the hero once (and on resize) — reading offsetHeight inside the
    // scroll handler forced a layout on every scroll event.
    const hero = home ? document.querySelector('.spotlight-hero') : null
    let cut = 0
    const measure = () => {
      cut =
        hero instanceof HTMLElement
          ? Math.max(120, hero.offsetHeight - 80)
          : Math.max(120, window.innerHeight - 80)
    }
    measure()
    const ro = hero ? new ResizeObserver(measure) : null
    if (hero && ro) ro.observe(hero)

    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const top = y < 12
      setAtTop((prev) => (prev === top ? prev : top))
      const over = home && y < cut
      setOverHero((prev) => (prev === over ? prev : over))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      ro?.disconnect()
    }
  }, [location.pathname, home])

  const navClass = [
    'site-nav',
    atTop ? 'at-top' : '',
    home && overHero ? 'on-hero' : 'over-content',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <Intro />
      <Cursor />
      <header className={navClass}>
        <Link className="logo" to="/" onClick={goHomeTop}>
          MBO
        </Link>
        <div className="nav-end">
          <button
            className="menu-toggle"
            type="button"
            data-sound-toggle
            onPointerDown={toggle}
          >
            {on ? 'Mute' : 'Sound'}
          </button>
          <Link
            className={`bag-link${bumped ? ' is-bumped' : ''}`}
            to="/bag"
            aria-label={count > 0 ? `Bag, ${count} items` : 'Bag'}
          >
            <BagIcon />
            {count > 0 && <span>{count}</span>}
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>
      <Menu open={open} onClose={close} />
      <BagSlip />
      {home ? null : <div className="nav-spacer" aria-hidden />}
      <div className="page-veil" key={location.pathname}>
        {/* Lazy routes suspend here only — nav and footer stay put. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
      <Footer />
    </>
  )
}
