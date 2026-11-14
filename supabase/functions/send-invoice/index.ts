// Supabase Edge Function: emails a buyer the invoice for a CONFIRMED order via Resend.
//
// Called from /admin/orders with the admin's login. Every database call runs AS
// that admin (their JWT), so the existing is_admin() checks guard it and no
// service-role key is needed. Only RESEND_API_KEY is secret.
//
// Secrets (supabase secrets set KEY=value):
//   RESEND_API_KEY      required
//   INVOICE_FROM        required, e.g. "MBO Nights <invoices@morebandsontheway.com>"
//                       (the domain must be verified in Resend)
//   INVOICE_REPLY_TO    optional, where customer replies go
//   INVOICE_BUSINESS    optional, legal/trading name   (default "MBO Nights")
//   INVOICE_ADDRESS     optional, one line, e.g. "Plot 123, Main Mall, Gaborone, Botswana"
//   INVOICE_REG_NO      optional, company registration number
//   INVOICE_VAT_NO      optional, VAT number (only shown if set)
//   SITE_URL            optional, for the ticket link (default https://morebandsontheway.com)
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'

type Line = {
  qty: number
  unitPrice: number
  title: string
  tierName: string
  date: string
  time: string
  venue: string
}
type Order = {
  ref: string
  token: string
  status: string
  buyer: { name: string; phone: string; email: string }
  total: number
  createdAt: string
  resolvedAt: string | null
  paymentNote: string | null
  lines: Line[]
  tickets: unknown[]
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const env = (k: string, fallback = '') => Deno.env.get(k)?.trim() || fallback

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const money = (n: number) =>
  `P${n.toLocaleString('en-BW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const day = (iso: string | null) =>
  new Date(iso ?? Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Gaborone',
  })

function invoiceHtml(o: Order) {
  const business = env('INVOICE_BUSINESS', 'MBO Nights')
  const address = env('INVOICE_ADDRESS')
  const reg = env('INVOICE_REG_NO')
  const vat = env('INVOICE_VAT_NO')
  const site = env('SITE_URL', 'https://morebandsontheway.com').replace(/\/$/, '')
  const ticketUrl = `${site}/order/${o.token}`
  const number = `INV-${o.ref}`

  // Single-column layout: nothing sits side by side except a label and its value,
  // so it reads the same on a 320px phone as on a desktop client.
  const muted = 'color:#6b675f;'
  const label = `font-size:11px;letter-spacing:2px;text-transform:uppercase;${muted}`
  const kv = (k: string, v: string, strong = false, big = false) => `
      <tr>
        <td style="padding:6px 0;font-size:14px;${muted}">${esc(k)}</td>
        <td style="padding:6px 0;text-align:right;white-space:nowrap;font-size:${big ? 20 : 14}px;">${strong ? `<strong>${esc(v)}</strong>` : esc(v)}</td>
      </tr>`

  // One block per event (name, date and venue shown once), then a compact row per ticket type.
  const events = new Map<string, Line[]>()
  for (const l of o.lines) {
    const key = [l.title, l.date, l.time, l.venue].join('|')
    events.set(key, [...(events.get(key) ?? []), l])
  }
  const rows = [...events.values()]
    .map((lines) => {
      const e = lines[0]
      const tiers = lines
        .map(
          (l) => `
      <tr>
        <td style="padding:4px 0;font-size:14px;">${l.qty} × ${esc(l.tierName)} <span style="${muted}font-size:13px;white-space:nowrap;">@ ${money(l.unitPrice)}</span></td>
        <td style="padding:4px 0 4px 12px;text-align:right;vertical-align:top;white-space:nowrap;font-size:14px;"><strong>${money(l.unitPrice * l.qty)}</strong></td>
      </tr>`,
        )
        .join('')
      return `
      <tr><td colspan="2" style="padding:16px 0 6px;font-size:15px;line-height:1.45;">
        <strong>${esc(e.title)}</strong><br>
        <span style="${muted}font-size:13px;">${esc(e.date)} · ${esc(e.time)} · ${esc(e.venue)}</span>
      </td></tr>
      ${tiers}
      <tr><td colspan="2" style="padding:0 0 12px;border-bottom:1px solid #e6e2da;font-size:0;line-height:0;">&nbsp;</td></tr>`
    })
    .join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(number)}</title></head>
<body style="margin:0;background:#f3f1ec;font-family:Helvetica,Arial,sans-serif;color:#161616;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ec;padding:16px 8px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
  <tr><td style="background:#0b0b0b;padding:24px 20px;color:#f3eee6;">
    <div style="font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase;white-space:nowrap;">${esc(business)}</div>
    <div style="margin-top:6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#d6ff4b;">Invoice · Paid</div>
  </td></tr>

  <tr><td style="padding:24px 20px 4px;">
    <div style="${label}margin-bottom:6px;">Billed to</div>
    <div style="font-size:15px;line-height:1.55;">
      <strong>${esc(o.buyer.name)}</strong><br>${esc(o.buyer.email)}<br>+267 ${esc(o.buyer.phone)}
    </div>
  </td></tr>

  <tr><td style="padding:16px 20px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6e2da;">
      ${kv('Invoice no.', number, true)}
      ${kv('Order ref', o.ref)}
      ${kv('Invoice date', day(o.resolvedAt))}
      ${kv('Order date', day(o.createdAt))}
    </table>
  </td></tr>

  <tr><td style="padding:24px 20px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="${label}padding-bottom:8px;border-bottom:2px solid #161616;">Item</td>
        <td style="${label}padding-bottom:8px;border-bottom:2px solid #161616;text-align:right;">Amount</td>
      </tr>
      ${rows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${kv('Total', money(o.total), true, true)}
      ${kv(`Paid${o.paymentNote ? ` (${o.paymentNote})` : ''}`, money(o.total))}
      ${kv('Balance due', money(0), true)}
    </table>
  </td></tr>

  <tr><td style="padding:24px 20px;">
    <a href="${esc(ticketUrl)}" style="display:block;text-align:center;background:#d6ff4b;color:#0b0b0b;text-decoration:none;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:13px;padding:16px 20px;">View your tickets</a>
    <p style="font-size:13px;${muted}line-height:1.55;margin:14px 0 0;">Show the QR codes on that page at the door. Keep this email as your proof of purchase.</p>
  </td></tr>

  <tr><td style="padding:20px 20px 24px;border-top:1px solid #e6e2da;font-size:12px;${muted}line-height:1.6;">
    <strong style="color:#161616;">${esc(business)}</strong>
    ${address ? `<br>${esc(address)}` : ''}
    ${reg ? `<br>Reg. no. ${esc(reg)}` : ''}
    ${vat ? `<br>VAT no. ${esc(vat)}` : ''}
    <br>${esc(site.replace(/^https?:\/\//, ''))}
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function invoiceText(o: Order) {
  return [
    `${env('INVOICE_BUSINESS', 'MBO Nights')} — Invoice INV-${o.ref} (PAID)`,
    '',
    `Billed to: ${o.buyer.name}, ${o.buyer.email}`,
    `Invoice date: ${day(o.resolvedAt)}`,
    '',
    ...o.lines.map((l) => `${l.qty} × ${l.title} ${l.tierName} (${l.date}) — ${money(l.unitPrice * l.qty)}`),
    '',
    `Total paid: ${money(o.total)}`,
    `Tickets: ${env('SITE_URL', 'https://morebandsontheway.com').replace(/\/$/, '')}/order/${o.token}`,
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Sign in again.' }, 401)

  const apiKey = env('RESEND_API_KEY')
  const from = env('INVOICE_FROM')
  if (!apiKey || !from) return json({ error: 'Email isn’t set up yet (RESEND_API_KEY / INVOICE_FROM).' }, 500)

  let ref = ''
  try {
    ref = String((await req.json())?.ref ?? '').trim()
  } catch {
    /* fall through */
  }
  if (!ref) return json({ error: 'Missing order reference.' }, 400)

  // Runs as the signed-in admin; admin_get_order refuses anyone else.
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })

  const { data: order, error } = await db.rpc('admin_get_order', { p_ref: ref })
  if (error || !order) return json({ error: error?.message ?? 'Order not found.' }, 403)
  const o = order as Order
  if (o.status !== 'confirmed') return json({ error: 'Confirm the payment before sending an invoice.' }, 409)

  const replyTo = env('INVOICE_REPLY_TO')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Same order + same minute = Resend sends once, even on a double click.
      'Idempotency-Key': `invoice-${o.ref}-${Math.floor(Date.now() / 60_000)}`,
    },
    body: JSON.stringify({
      from,
      to: [o.buyer.email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: `Your invoice INV-${o.ref} — ${env('INVOICE_BUSINESS', 'MBO Nights')}`,
      html: invoiceHtml(o),
      text: invoiceText(o),
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('[send-invoice] Resend', res.status, detail)
    return json({ error: 'The email service refused the invoice. Check the Resend dashboard.' }, 502)
  }

  const { data: updated } = await db.rpc('admin_mark_invoiced', { p_ref: o.ref })
  return json({ ok: true, order: updated ?? o })
})
