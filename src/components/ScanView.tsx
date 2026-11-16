import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import type { Ticket } from '../lib/tickets'

const CLOSE_MS = 260

const fmtUsed = (at: string | number) =>
  new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Full-screen, high-contrast view of one ticket's QR so it's quick to scan at the door. */
export default function ScanView({
  tickets,
  start,
  onClose,
}: {
  tickets: Ticket[]
  start: number
  onClose: (last: number) => void
}) {
  const [i, setI] = useState(start)
  const [qr, setQr] = useState('')
  const [closing, setClosing] = useState(false)
  const t = tickets[i]
  const count = tickets.length

  const close = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => onClose(i), CLOSE_MS)
  }

  useEffect(() => {
    let live = true
    setQr('')
    QRCode.toDataURL(t.code, {
      margin: 2,
      width: 900,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => live && setQr(url))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [t.code])

  // Esc / arrow keys, and lock page scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setI((n) => Math.min(count - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  })

  // Keep the screen awake while the code is up, where supported.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<typeof lock> } }
    nav.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => undefined)
    return () => void lock?.release().catch(() => undefined)
  }, [])

  // Swipe left/right to move between tickets; a tap (no swipe) closes.
  const [startX, setStartX] = useState<number | null>(null)
  const onPointerUp = (e: React.PointerEvent) => {
    const dx = startX === null ? 0 : e.clientX - startX
    setStartX(null)
    if (Math.abs(dx) > 40) {
      setI((n) => Math.max(0, Math.min(count - 1, n + (dx < 0 ? 1 : -1))))
    } else close()
  }

  return createPortal(
    <div
      className={`scan-view${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Ticket ${i + 1} of ${count}. Tap to close.`}
      onPointerDown={(e) => setStartX(e.clientX)}
      onPointerUp={onPointerUp}
    >
      <div className={`scan-qr${t.checkedInAt ? ' is-used' : ''}`} key={t.code}>
        {qr ? <img src={qr} alt={`QR code for ticket ${t.code}`} draggable={false} /> : <div className="scan-qr-blank" />}
        {t.checkedInAt && (
          <div className="pass-stamp" aria-label={`Scanned at the door, ${fmtUsed(t.checkedInAt)}`}>
            <span className="pass-stamp-word">Scanned</span>
            <span className="pass-stamp-time">{fmtUsed(t.checkedInAt)}</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
