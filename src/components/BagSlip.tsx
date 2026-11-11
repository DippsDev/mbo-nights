import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart, type BagNotice } from '../cart'

const SHOW_MS = 2600
const LEAVE_MS = 320

/**
 * A small tear-off slip that drops in under the header whenever something
 * lands in the bag (or can't). Replaces the old centred toast.
 */
export default function BagSlip() {
  const { notice, dismissNotice } = useCart()
  // Keep the last notice mounted while it animates out.
  const [shown, setShown] = useState<BagNotice | null>(null)
  const [leaving, setLeaving] = useState(false)
  if (notice && notice !== shown) {
    setShown(notice)
    setLeaving(false)
  }

  const shownId = shown?.id
  useEffect(() => {
    if (shownId === undefined) return
    const hide = window.setTimeout(() => setLeaving(true), SHOW_MS)
    const gone = window.setTimeout(() => {
      setShown(null)
      dismissNotice()
    }, SHOW_MS + LEAVE_MS)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(gone)
    }
  }, [shownId, dismissNotice])

  if (!shown) return null

  const added = shown.kind === 'added'
  return (
    <div
      className={`bag-slip${leaving ? ' is-leaving' : ''}${added ? '' : ' is-limit'}`}
      role="status"
      aria-live="polite"
      key={shown.id}
    >
      <span className="bag-slip-stub" aria-hidden>
        {added ? '+1' : '!'}
      </span>
      <span className="bag-slip-body">
        <span className="bag-slip-kicker">{added ? 'In your bag' : 'Hold on'}</span>
        <span className="bag-slip-title">{shown.title}</span>
        {shown.detail && <span className="bag-slip-detail">{shown.detail}</span>}
      </span>
      {added && (
        <Link className="bag-slip-link" to="/bag" onClick={dismissNotice}>
          View bag →
        </Link>
      )}
    </div>
  )
}
