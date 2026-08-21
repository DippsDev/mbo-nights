import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useCart } from '../cart'

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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className={`menu-overlay ${open ? 'open' : ''}`} aria-hidden={!open}>
      <nav>
        {links.map(([to, label], i) => (
          <NavLink key={to} to={to} onClick={onClose} style={{ '--i': i } as CSSProperties}>
            <span>0{i + 1}</span>
            {label}
          </NavLink>
        ))}
        <NavLink to="/bag" onClick={onClose} style={{ '--i': links.length } as CSSProperties}>
          <span>0{links.length + 1}</span>
          Bag{count > 0 ? ` (${count})` : ''}
        </NavLink>
      </nav>
    </div>
  )
}
