import { useEffect, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { useCart } from '../cart'
import { reducedMotion } from '../lib/motion'

const links = [
  ['/', 'Home'],
  ['/events', 'Nights'],
  ['/artists', 'Artists'],
  ['/venues', 'Rooms'],
  ['/shop', 'Shop'],
  ['/about', 'About'],
] as const

export default function Menu({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { count } = useCart()
  const location = useLocation()
  const overlay = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  const tween = useRef<gsap.core.Timeline | null>(null)
  const seen = useRef(false)
  const locked = useRef(false)
  const scrollY = useRef(0)

  useEffect(() => {
    scrollY.current = 0
  }, [location.pathname])

  useLayoutEffect(() => {
    const el = overlay.current
    const menu = nav.current
    if (!el || !menu) return
    const items = menu.querySelectorAll('a')
    const reduce = reducedMotion()

    tween.current?.kill()
    tween.current = null

    if (!seen.current) {
      seen.current = true
      gsap.set(el, { autoAlpha: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' })
      gsap.set(items, { autoAlpha: open ? 1 : 0, y: open ? 0 : 36 })
      return
    }

    if (open) {
      if (reduce) {
        gsap.set(el, { autoAlpha: 1, pointerEvents: 'auto' })
        gsap.set(items, { autoAlpha: 1, y: 0 })
        return
      }

      tween.current = gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .set(el, { pointerEvents: 'auto' })
        .to(el, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0)
        .fromTo(
          items,
          { autoAlpha: 0, y: 36 },
          { autoAlpha: 1, y: 0, duration: 0.58, stagger: 0.055 },
          0.08,
        )
      return
    }

    if (reduce) {
      gsap.set(el, { autoAlpha: 0, pointerEvents: 'none' })
      gsap.set(items, { autoAlpha: 0, y: 24 })
      return
    }

    tween.current = gsap
      .timeline({ defaults: { ease: 'power2.in' } })
      .set(el, { pointerEvents: 'none' })
      .to(
        items,
        {
          autoAlpha: 0,
          y: 18,
          duration: 0.28,
          stagger: { each: 0.035, from: 'end' },
        },
        0,
      )
      .to(el, { autoAlpha: 0, duration: 0.42, ease: 'power2.inOut' }, 0.06)
  }, [open])

  useEffect(() => {
    const lock = () => {
      if (locked.current) return
      locked.current = true
      scrollY.current = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY.current}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'
    }

    const unlock = () => {
      if (!locked.current) return
      locked.current = false
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY.current)
    }

    if (open) {
      lock()
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }

    const id = window.setTimeout(unlock, reducedMotion() ? 0 : 560)
    return () => window.clearTimeout(id)
  }, [open, onClose])

  useEffect(
    () => () => {
      if (!locked.current) return
      locked.current = false
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
    },
    [],
  )

  return (
    <div
      className={`menu-overlay ${open ? 'open' : ''}`}
      ref={overlay}
      aria-hidden={!open}
    >
      <nav ref={nav}>
        {links.map(([to, label], i) => (
          <NavLink key={to} to={to} onClick={onClose}>
            <span className="menu-index">0{i + 1}</span>
            <span className="menu-label">{label}</span>
          </NavLink>
        ))}
        <NavLink to="/bag" onClick={onClose}>
          <span className="menu-index">0{links.length + 1}</span>
          <span className="menu-label">Bag{count > 0 ? ` (${count})` : ''}</span>
        </NavLink>
      </nav>
    </div>
  )
}
