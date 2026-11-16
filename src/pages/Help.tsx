import { Link } from 'react-router-dom'
import { CONFIRM_WITHIN_HOURS, HELP_WHATSAPP_DISPLAY, helpLink } from '../lib/help'

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'I paid but haven’t got my QR code',
    a: (
      <>
        We check every payment by hand and confirm within {CONFIRM_WITHIN_HOURS} hours. Your tickets appear on your
        order page as soon as they’re confirmed. If it’s been longer than that, message us with your order reference
        (it starts with MBO-) and the number you paid from.
      </>
    ),
  },
  {
    q: 'I lost my order link',
    a: (
      <>
        Go to <Link to="/tickets">My tickets</Link> and search with the cell number and email you used at checkout.
      </>
    ),
  },
  {
    q: 'My payment was marked “not found”',
    a: (
      <>
        It means we couldn’t match a payment to your order. If you did pay, message us with your reference, the number
        you paid from and, if you can, a photo of the payment SMS.
      </>
    ),
  },
  {
    q: 'My order expired before I paid',
    a: <>Unpaid orders are released after the payment window. Just place a new order — if you already paid, message us.</>,
  },
  {
    q: 'Wrong name, number or email on my order',
    a: <>Message us with your order reference and the correct details and we’ll fix it.</>,
  },
  {
    q: 'Refunds',
    a: (
      <>
        See our <Link to="/legal/terms">terms</Link> for when refunds apply.
      </>
    ),
  },
]

export default function Help() {
  return (
    <main className="page flow help-page">
      <header className="page-hero">
        <p className="kicker">Help</p>
        <h1 className="display lg">Need a hand?</h1>
        <p className="serif">
          Problem with an order or ticket? Message the MBO team on WhatsApp at {HELP_WHATSAPP_DISPLAY}. Include your
          order reference so we can find it fast.
        </p>
        <a className="btn" href={helpLink('my order')} target="_blank" rel="noopener noreferrer">
          Message us on WhatsApp
        </a>
      </header>
      <section className="section help-faq" style={{ paddingTop: 0 }}>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
    </main>
  )
}
