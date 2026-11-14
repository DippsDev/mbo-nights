import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import TicketPass from './TicketPass'
import ScanView from './ScanView'
import type { Ticket } from '../lib/tickets'

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Run a DOM-changing update as an animated view transition where the browser supports it. */
function animate(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (!doc.startViewTransition || reduceMotion()) return update()
  doc.startViewTransition(() => flushSync(update))
}

/**
 * Swipeable deck of ticket passes: one QR on screen at a time, so the door can scan
 * them in turn. "View all" unfolds the deck into a list with a smooth transition.
 */
export default function PassDeck({ tickets, holder }: { tickets: Ticket[]; holder: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [all, setAll] = useState(false)
  const [scan, setScan] = useState<number | null>(null)
  const count = tickets.length

  // When folding back into the deck, land on the ticket that was last in view.
  useLayoutEffect(() => {
    const el = track.current
    if (el && !all) el.scrollLeft = active * el.clientWidth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all])

  const go = (i: number) => {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(count - 1, i))
    el.scrollTo({ left: next * el.clientWidth, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }

  const onScroll = () => {
    const el = track.current
    if (el && !all) setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  const toggle = (showAll: boolean, focus = active) =>
    animate(() => {
      setActive(focus)
      setAll(showAll)
    })

  const scanView =
    scan !== null ? (
      <ScanView
        tickets={tickets}
        start={scan}
        holder={holder}
        onClose={(last) => {
          setScan(null)
          if (!all) go(last)
        }}
      />
    ) : null

  const tap = (i: number) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Open ticket ${i + 1} to scan`,
    onClick: () => setScan(i),
    onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setScan(i)),
  })

  if (count <= 1) {
    return (
      <>
        {tickets.map((t, i) => (
          <div className="pass-tap" key={t.code} {...tap(i)}>
            <TicketPass ticket={t} holder={holder} index={i} count={count} />
          </div>
        ))}
        {scanView}
      </>
    )
  }

  return (
    <div className={`pass-deck${all ? ' is-all' : ''}`}>
      <div className="pass-deck-bar">
        <p className="kicker" aria-live="polite">
          {all ? `All ${count} tickets` : `Ticket ${active + 1} of ${count}`}
        </p>
        <div className="pass-deck-nav">
          {!all && (
            <>
              <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous ticket">
                ←
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                disabled={active === count - 1}
                aria-label="Next ticket"
              >
                →
              </button>
            </>
          )}
          <button type="button" className="pass-deck-toggle" onClick={() => toggle(!all)} aria-pressed={all}>
            {all ? 'One at a time' : 'View all'}
          </button>
        </div>
      </div>

      <div className="pass-deck-track" ref={track} onScroll={onScroll}>
        {tickets.map((t, i) => (
          <div
            className={`pass-deck-slide${i === active ? ' is-active' : ''}`}
            key={t.code}
            style={{ viewTransitionName: `pass-${i}`, '--i': i } as React.CSSProperties}
            aria-hidden={!all && i !== active}
            {...tap(i)}
          >
            <TicketPass ticket={t} holder={holder} index={i} count={count} />
          </div>
        ))}
      </div>

      {!all && (
        <div className="pass-deck-dots">
          {tickets.map((t, i) => (
            <button
              type="button"
              key={t.code}
              className={i === active ? 'on' : ''}
              onClick={() => go(i)}
              aria-label={`Show ticket ${i + 1}`}
            />
          ))}
        </div>
      )}
      <p className="pass-deck-hint">Tap a ticket to open it for scanning</p>
      {scanView}
    </div>
  )
}
