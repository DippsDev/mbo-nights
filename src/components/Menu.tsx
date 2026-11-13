import { useEffect, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../cart'
import { reducedMotion } from '../lib/motion'
import { TICKETS_ENABLED } from '../lib/flags'

const links = [
  ['/', 'Home'],
  ['/artists', 'Artists'],
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
  const running = useRef<Animation[]>([])
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
    const items = Array.from(menu.querySelectorAll<HTMLElement>('a, .menu-disabled'))

    // Freeze whatever is mid-flight where it is, then drop the old animations.
    for (const a of running.current) {
      try {
        a.commitStyles()
      } catch {
        /* element not rendered */
      }
      a.cancel()
    }
    running.current = []

    const setOverlay = (on: boolean) => {
      el.style.opacity = on ? '1' : '0'
      el.style.visibility = on ? 'visible' : 'hidden'
      el.style.pointerEvents = on ? 'auto' : 'none'
    }
    const setItems = (on: boolean, y: number) => {
      for (const item of items) {
        item.style.opacity = on ? '1' : '0'
        item.style.transform = on ? 'none' : `translate3d(0, ${y}px, 0)`
      }
    }
    const play = (target: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = target.animate(frames, { fill: 'both', ...opts })
      running.current.push(a)
      return a
    }

    if (!seen.current || reducedMotion()) {
      seen.current = true
      setOverlay(open)
      setItems(open, open ? 0 : 36)
      return
    }

    const outExpo = 'cubic-bezier(0.22, 1, 0.36, 1)'
    if (open) {
      setOverlay(true)
      setItems(true, 0)
      play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' })
      items.forEach((item, i) =>
        play(
          item,
          [
            { opacity: 0, transform: 'translate3d(0, 36px, 0)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 580, delay: 80 + i * 55, easing: outExpo },
        ),
      )
      return
    }

    el.style.pointerEvents = 'none'
    items.forEach((item, i) =>
      play(
        item,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translate3d(0, 18px, 0)' },
        ],
        { duration: 280, delay: (items.length - 1 - i) * 35, easing: 'ease-in' },
      ),
    )
    const fade = play(el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 420,
      delay: 60,
      easing: 'ease-in-out',
    })
    fade.onfinish = () => {
      setOverlay(false)
      setItems(false, 18)
      for (const a of running.current) a.cancel()
      running.current = []
    }
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
      const y = scrollY.current
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.width = ''
      window.scrollTo(0, y)
    }

    if (open) {
      lock()
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', onKey)
      return () => {
        window.removeEventListener('keydown', onKey)
        // Always release on effect teardown so HMR / route changes can't leave body fixed.
        unlock()
      }
    }

    unlock()
    return undefined
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
        {TICKETS_ENABLED ? (
          <NavLink to="/admin/orders" onClick={onClose}>
            <span className="menu-index">0{links.length + 2}</span>
            <span className="menu-label">Administrator</span>
          </NavLink>
        ) : (
          <button type="button" className="menu-disabled" disabled>
            <span className="menu-index">0{links.length + 2}</span>
            <span className="menu-label">Administrator</span>
          </button>
        )}
      </nav>
    </div>
  )
}
