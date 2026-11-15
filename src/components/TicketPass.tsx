import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Ticket } from '../lib/tickets'

export default function TicketPass({
  ticket,
  holder,
  index,
  count,
}: {
  ticket: Ticket
  holder: string
  index: number
  count: number
}) {
  const [qr, setQr] = useState('')
  const used = ticket.checkedInAt
  const usedAt = used
    ? new Date(used).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  useEffect(() => {
    let live = true
    QRCode.toDataURL(ticket.code, {
      margin: 1,
      width: 480,
      errorCorrectionLevel: 'M',
      color: { dark: '#070707', light: '#f3eee6' },
    })
      .then((url) => live && setQr(url))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [ticket.code])

  return (
    <article className={`pass${used ? ' is-used' : ''}`}>
      <div className="pass-copy">
        <p className="kicker">
          {ticket.tierName} · {index + 1} of {count}
        </p>
        <h2 className="display md">{ticket.title}</h2>
        <p>
          {ticket.date} · {ticket.time}
          <br />
          {ticket.venue}
        </p>
        <p className="demo-note">{holder}</p>
      </div>
      <div className="pass-qr">
        {qr ? <img src={qr} alt={`QR code for ticket ${ticket.code}`} /> : <div className="pass-qr-blank" />}
        <code>{ticket.code}</code>
      </div>
      {used && (
        <div className="pass-stamp" aria-label={`Scanned at the door, ${usedAt}`}>
          <span className="pass-stamp-word">Scanned</span>
          <span className="pass-stamp-time">{usedAt}</span>
        </div>
      )}
    </article>
  )
}
