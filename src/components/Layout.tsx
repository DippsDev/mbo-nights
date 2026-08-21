import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../cart'
import { SHOWREEL_CLIPS, nextOpenNight } from '../data'
import { HeroBedProvider } from '../heroBed'
import { reducedMotion } from '../lib/motion'
import { useSound } from '../sound'
import AtmosphereVideo from './AtmosphereVideo'
import Cursor from './Cursor'
import Intro from './Intro'
import Menu from './Menu'

export default function Layout() {
  const { count } = useCart()
  const { on, toggle } = useSound()
  const next = nextOpenNight()
  const location = useLocation()
  const home = location.pathname === '/'
  const [open, setOpen] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const [bedOn, setBedOn] = useState(true)
  const close = useCallback(() => setOpen(false), [])
  const toggleBed = useCallback(() => setBedOn((v) => !v), [])

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
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY < 12
      setAtTop((prev) => (prev === top ? prev : top))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  return (
    <HeroBedProvider playing={bedOn} toggle={toggleBed}>
      <Intro />
      <Cursor />
      <AtmosphereVideo
        className={`hero-bed persistent-hero-bed${home ? ' is-home' : ''}`}
        clips={SHOWREEL_CLIPS}
        alt=""
        cover
        playing={bedOn}
        eager
      />
      <header
        className={`site-nav${atTop ? ' at-top' : ''}${home ? '' : ' over-content'}`}
      >
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
          <Link className="bag-link" to="/bag">
            Bag {count > 0 && <span>{count}</span>}
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
      {home ? null : <div className="nav-spacer" aria-hidden />}
      <div className="page-veil" key={location.pathname}>
        <Outlet />
      </div>
      <footer className="site-foot">
        <span>Placeholder footer text</span>
        {next && (
          <Link to={`/events/${next.id}`}>
            Next: {next.title} · {next.date}
          </Link>
        )}
      </footer>
    </HeroBedProvider>
  )
}
