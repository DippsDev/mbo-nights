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
    <article className="pass">
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
    </article>
  )
}
