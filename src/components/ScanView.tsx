import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import type { Ticket } from '../lib/tickets'

const CLOSE_MS = 280

/** Full-screen, high-contrast view of one ticket's QR so it's quick to scan at the door. */
export default function ScanView({
  tickets,
  start,
  holder,
  onClose,
}: {
  tickets: Ticket[]
  start: number
  holder: string
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

  return createPortal(
    <div
      className={`scan-view${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Ticket ${i + 1} of ${count}`}
      onClick={close}
    >
      <div className="scan-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="scan-head">
          <p className="kicker">
            {t.tierName} · {i + 1} of {count}
          </p>
          <button type="button" className="scan-close" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="scan-qr" key={t.code}>
          {qr ? <img src={qr} alt={`QR code for ticket ${t.code}`} /> : <div className="scan-qr-blank" />}
        </div>
        <code className="scan-code">{t.code}</code>

        <div className="scan-info">
          <h2 className="display md">{t.title}</h2>
          <p>
            {t.date} · {t.time} · {t.venue}
          </p>
          <p className="demo-note">{holder}</p>
        </div>

        {count > 1 && (
          <div className="scan-nav">
            <button type="button" onClick={() => setI(i - 1)} disabled={i === 0}>
              ← Prev
            </button>
            <button type="button" onClick={() => setI(i + 1)} disabled={i === count - 1}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
