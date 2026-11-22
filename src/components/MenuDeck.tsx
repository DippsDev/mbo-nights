import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MenuSection } from '../data'
import CategoryTabs from './CategoryTabs'
import Stack, { type StackHandle } from './Stack'

type Props = {
  onClose: () => void
  /** Event name, e.g. 'FEED THE STREETS'. */
  title: string
  sections: MenuSection[]
}

// Touch screens swipe; mouse users drag or click.
const TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const pad = (n: number) => String(n).padStart(2, '0')
const pula = (n: number) => `P${n.toLocaleString('en-US')}`

/**
 * Food & drinks as a deck of tear-off tickets, one per menu section, in the same
 * ticket style as the event's tiers. Pick a category from the pill bar, or swipe,
 * tap or use the arrow keys to move through the deck. With reduced motion on, the tickets show as a plain scrolling list instead.
 * Mount only while open: unmounting resets the deck to its first ticket.
 */
export default function MenuDeck({ onClose, title, sections }: Props) {
  const reduce = useReducedMotion()
  const stack = useRef<StackHandle>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [top, setTop] = useState(0)
  // "Swipe for more" pill: shows shortly after opening, leaves on the first move or after 5s.
  const [hint, setHint] = useState(false)
  useEffect(() => {
    const show = window.setTimeout(() => setHint(true), 700)
    const hide = window.setTimeout(() => setHint(false), 5700)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [])
  // Read through a ref so a new onClose from a parent re-render doesn't re-run the open effect.
  const closeCb = useRef(onClose)
  useEffect(() => {
    closeCb.current = onClose
  }, [onClose])

  useEffect(() => {
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    const before = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCb.current()
      if (e.key === 'ArrowRight') stack.current?.next()
      if (e.key === 'ArrowLeft') stack.current?.prev()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      html.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      before?.focus()
    }
  }, [])

  const total = sections.length
  const cards = sections.map((section, i) => ({
    id: section.title,
    content: <MenuTicket section={section} index={i} total={total} />,
  }))

  // Portal to <body> so the deck sits above the fixed site nav, not inside the page's layer.
  return createPortal(
    <div
      className="menu-deck"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} food and drinks menu`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="menu-deck-head">
        <p className="kicker">
          Food &amp; drinks<span className="menu-deck-event"> · {title}</span>
        </p>
        <button ref={closeRef} className="btn ghost menu-deck-close" onClick={onClose}>
          Close
        </button>
      </div>

      {reduce ? (
        <div className="menu-deck-list">
          {sections.map((section, i) => (
            <MenuTicket key={section.title} section={section} index={i} total={total} />
          ))}
        </div>
      ) : (
        <div className="menu-deck-main">
          <CategoryTabs
            label="Menu categories"
            items={sections.map((s) => s.tab)}
            active={top}
            onSelect={(i) => stack.current?.bringToTop(sections[i].title)}
          />
          <div className="menu-deck-stack">
          <Stack
            ref={stack}
            cards={cards}
            width="var(--deck-w)"
            height="var(--deck-h)"
            onTopChange={(id) => {
              setTop(sections.findIndex((s) => s.title === id))
              setHint(false)
            }}
          />
          <AnimatePresence>
            {hint && (
              <motion.p
                className="menu-deck-swipe"
                aria-hidden
                initial={{ opacity: 0, y: 12, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 8, x: '-50%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <svg className="menu-deck-swipe-icon" viewBox="0 0 24 16" width="22" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8h18M15 3l5 5-5 5" />
                </svg>
                {TOUCH ? 'Swipe to see the menu' : 'Drag or tap to see the menu'}
              </motion.p>
            )}
          </AnimatePresence>
          </div>
          <p className="sr-only" aria-live="polite">
            {sections[top]?.title}, {top + 1} of {total}
          </p>
        </div>
      )}

    </div>,
    document.body,
  )
}

function MenuTicket({ section, index, total }: { section: MenuSection; index: number; total: number }) {
  return (
    <article className={`menu-ticket is-${section.kind}`}>
      <div className="menu-ticket-stub" aria-hidden>
        <span className="menu-ticket-num">{pad(index + 1)}</span>
        <span className="menu-ticket-of">/{pad(total)}</span>
        <span className="menu-ticket-side">{section.kind}</span>
      </div>
      <div className="menu-ticket-body">
        <h2 className="menu-ticket-title">{section.title}</h2>
        <ul>
          {section.items.map((item) => (
            <li className={`menu-ticket-item${item.soldOut ? ' is-sold-out' : ''}`} key={item.name}>
              <span className="menu-ticket-name">
                {item.name}
                {item.note && <small>{item.note}</small>}
              </span>
              <span className="menu-ticket-dots" aria-hidden />
              <span className="menu-ticket-price">
                {item.soldOut ? 'Sold out' : item.price != null ? pula(item.price) : '—'}
              </span>
            </li>
          ))}
        </ul>
        {section.note && <p className="menu-ticket-note">{section.note}</p>}
      </div>
    </article>
  )
}
