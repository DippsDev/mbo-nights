/**
 * Ticketing data layer — talks to the Supabase functions in
 * supabase/migrations/0001_ticketing.sql. The database is the source of truth
 * for price, stock and order state; data.ts only supplies images and copy.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
// The Supabase client (~120 kB) is loaded on first use, so it stays out of the
// first-paint bundle; the home page only needs it once stock is fetched.
let client: Promise<typeof import('./supabase')['supabase']> | undefined
const db = () => (client ??= import('./supabase').then((m) => m.supabase))

export { TICKETS_ENABLED } from './flags'

const env = import.meta.env
const PAY_NAME = env.VITE_PAY2CELL_NAME || 'MBO Nights'

export type PayMethod = {
  id: string
  label: string
  /** Shown greyed out and can't be picked (e.g. not available yet). */
  disabled?: boolean
  /** One line on how to send it. */
  how: string
  /** Label/value rows shown with Copy buttons (amount and reference are added by the page). */
  rows: [string, string][]
  /** What the "sent from" field asks for. */
  fromLabel: string
}

/**
 * Every way a client can pay. A method only shows when its account is set in
 * the env, so adding one is just adding its VITE_ keys. The client's choice is
 * saved in the order's payment note for whoever confirms it.
 */
export const PAY_METHODS: PayMethod[] = (
  [
    {
      id: 'pay2cell',
      label: 'FNB Pay2Cell',
      how: 'In the FNB app or *130#, send with Pay2Cell.',
      rows: [
        ['Send to', env.VITE_PAY2CELL_NUMBER || '78 756 059'],
        ['Name', PAY_NAME],
      ],
      fromLabel: 'Sent from a different number? (optional)',
    },
    {
      id: 'orange',
      disabled: true,
      label: 'Orange Money',
      how: 'Dial *145# or use the Orange Money app → Send money.',
      rows: [
        ['Send to', env.VITE_ORANGE_MONEY_NUMBER ?? ''],
        ['Name', env.VITE_ORANGE_MONEY_NAME || PAY_NAME],
      ],
      fromLabel: 'Sent from a different number? (optional)',
    },
    {
      id: 'myzaka',
      disabled: true,
      label: 'Mascom MyZaka',
      how: 'Dial *167# → Send money.',
      rows: [
        ['Send to', env.VITE_MYZAKA_NUMBER ?? ''],
        ['Name', env.VITE_MYZAKA_NAME || PAY_NAME],
      ],
      fromLabel: 'Sent from a different number? (optional)',
    },
    {
      id: 'smega',
      disabled: true,
      label: 'BTC Smega',
      how: 'Dial *173# → Send money.',
      rows: [
        ['Send to', env.VITE_SMEGA_NUMBER ?? ''],
        ['Name', env.VITE_SMEGA_NAME || PAY_NAME],
      ],
      fromLabel: 'Sent from a different number? (optional)',
    },
    {
      id: 'eft',
      label: 'Bank transfer',
      how: 'Any bank, by app or branch. Same-bank transfers clear fastest.',
      rows: [
        ['Bank', env.VITE_BANK_NAME ?? ''],
        ['Account', env.VITE_BANK_ACCOUNT ?? ''],
        ['Branch', env.VITE_BANK_BRANCH ?? ''],
        ['Holder', env.VITE_BANK_HOLDER || PAY_NAME],
      ],
      fromLabel: 'Account name you paid from (optional)',
    },
  ] satisfies PayMethod[]
)
  // Skip a method whose number/account isn't set. Branch may be blank.
  .map((m) => ({ ...m, rows: m.rows.filter(([k, v]) => v || k === 'Name' || k === 'Holder') }))
  .filter((m) => m.rows.some(([k]) => k === 'Send to' || k === 'Account'))

/** The method with this id, or the first usable one if it's unknown, disabled or not set up. */
export const payMethod = (id?: string | null) =>
  PAY_METHODS.find((m) => m.id === id && !m.disabled) ??
  PAY_METHODS.find((m) => !m.disabled) ??
  PAY_METHODS[0]

/** Must match the interval in create_order(). */
export const HOLD_MINUTES = 120
/** Must match the order_lines.qty check. */
export const MAX_PER_TIER = 10

export type OrderStatus =
  | 'awaiting_payment'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'expired'

export type Buyer = { name: string; phone: string; email: string }

export type OrderLine = {
  nightId: string
  tierId: string
  qty: number
  unitPrice: number
  title: string
  tierName: string
  date: string
  time: string
  venue: string
}

export type Ticket = {
  code: string
  nightId: string
  tierId: string
  title: string
  tierName: string
  date: string
  time: string
  venue: string
  checkedInAt?: number
}

export type Order = {
  ref: string
  /** Secret for the customer's order link. */
  token: string
  status: OrderStatus
  buyer: Buyer
  lines: OrderLine[]
  total: number
  createdAt: number
  expiresAt: number
  paymentNote?: string
  reportedPaidAt?: number
  resolvedAt?: number
  /** When the emailed invoice last went out (unset = never). */
  invoiceSentAt?: number
  tickets: Ticket[]
}

export class TicketError extends Error {}

/** Ticket cart keys look like `ticket:<nightId>:<tierId>`. */
export function ticketRef(item: { key: string }) {
  const [, nightId = '', tierId = ''] = item.key.split(':')
  return { nightId, tierId }
}

// ---- plumbing --------------------------------------------------------------

type RawTicket = Omit<Ticket, 'checkedInAt'> & { checkedInAt: string | null }
type RawOrder = Omit<
  Order,
  'createdAt' | 'expiresAt' | 'reportedPaidAt' | 'resolvedAt' | 'invoiceSentAt' | 'paymentNote' | 'tickets'
> & {
  invoiceSentAt?: string | null
  createdAt: string
  expiresAt: string
  reportedPaidAt: string | null
  resolvedAt: string | null
  paymentNote: string | null
  tickets: RawTicket[]
}

const ms = (iso: string | null) => (iso ? Date.parse(iso) : undefined)

function toOrder(raw: RawOrder): Order {
  return {
    ...raw,
    createdAt: Date.parse(raw.createdAt),
    expiresAt: Date.parse(raw.expiresAt),
    reportedPaidAt: ms(raw.reportedPaidAt),
    resolvedAt: ms(raw.resolvedAt),
    invoiceSentAt: ms(raw.invoiceSentAt ?? null),
    paymentNote: raw.paymentNote ?? undefined,
    tickets: raw.tickets.map((t) => ({ ...t, checkedInAt: ms(t.checkedInAt) })),
  }
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await (await db()).rpc(fn, args)
  if (error) {
    // P0001 = a message raised on purpose by our SQL; safe to show.
    if (error.code === 'P0001') throw new TicketError(error.message)
    console.error(`[tickets] ${fn}`, error)
    throw new TicketError(
      navigator.onLine ? 'Something went wrong. Try again.' : 'You’re offline. Check your connection.',
    )
  }
  return data as T
}

// ---- stock -----------------------------------------------------------------

export type TierStock = { remaining: number; price: number; name: string }
export type Stock = Record<string, TierStock>

export const stockKey = (nightId: string, tierId: string) => `${nightId}:${tierId}`

type StockRow = { event_id: string; tier_id: string; name: string; price: number; remaining: number }

/**
 * Plain REST call instead of the Supabase client: the homepage only needs stock,
 * so it no longer downloads the ~55 KB client on first load.
 */
async function stockRows(): Promise<StockRow[]> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
  if (!url || !key) return call<StockRow[]>('tier_stock')
  const res = await fetch(`${url}/rest/v1/rpc/tier_stock`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) {
    console.error('[tickets] tier_stock', res.status, await res.text().catch(() => ''))
    throw new TicketError(
      navigator.onLine ? 'Something went wrong. Try again.' : 'You’re offline. Check your connection.',
    )
  }
  return res.json()
}

export async function fetchStock(): Promise<Stock> {
  const rows = await stockRows()
  return Object.fromEntries(
    rows.map((r) => [
      stockKey(r.event_id, r.tier_id),
      { remaining: r.remaining, price: r.price, name: r.name },
    ]),
  )
}

/** Live stock; refetches when the tab regains focus. `stock` is null until loaded. */
export function useStock() {
  const [stock, setStock] = useState<Stock | null>(null)
  const [error, setError] = useState(false)

  const reload = useCallback(() => {
    fetchStock()
      .then((s) => {
        setStock(s)
        setError(false)
      })
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    reload()
    const onFocus = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [reload])

  return { stock, error, reload }
}

// ---- customer --------------------------------------------------------------

export async function createOrder(
  buyer: Buyer,
  items: { nightId: string; tierId: string; qty: number }[],
): Promise<Order> {
  const raw = await call<RawOrder>('create_order', {
    p_name: buyer.name,
    p_phone: buyer.phone,
    p_email: buyer.email,
    p_items: items,
  })
  return toOrder(raw)
}

export async function getOrder(token: string): Promise<Order | undefined> {
  const raw = await call<RawOrder | null>('get_order', { p_token: token })
  return raw ? toOrder(raw) : undefined
}

/** Returns the order's secret token when reference + phone match. */
export async function findOrder(ref: string, phone: string): Promise<string | undefined> {
  return (await call<string | null>('find_order', { p_ref: ref, p_phone: phone })) ?? undefined
}

/** Every order booked with this cell number AND email, newest first. */
export async function findOrders(phone: string, email: string): Promise<Order[]> {
  return (await call<RawOrder[]>('find_orders', { p_phone: phone, p_email: email })).map(toOrder)
}

/* Orders placed on this device, so a customer can get back to them without a
   reference. Only the secret order link is kept; details are always fetched. */
const SAVED_KEY = 'mbo:orders'

export function savedOrderTokens(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

/** How many orders "On this device" shows; older ones are forgotten. */
export const DEVICE_ORDER_LIMIT = 6

/** Replaces the saved list, e.g. after dropping old or deleted orders. */
export function keepOrderTokens(tokens: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(tokens))
  } catch {
    /* private mode etc. */
  }
}

export function saveOrderToken(token: string) {
  try {
    const next = [token, ...savedOrderTokens().filter((t) => t !== token)].slice(0, 20)
    localStorage.setItem(SAVED_KEY, JSON.stringify(next))
  } catch {
    /* private mode etc. — lookup by number still works */
  }
}

export async function reportPaid(token: string, paymentNote: string) {
  return toOrder(await call<RawOrder>('report_paid', { p_token: token, p_note: paymentNote }))
}

export async function cancelOrder(token: string) {
  return toOrder(await call<RawOrder>('cancel_order', { p_token: token }))
}

// ---- admin -----------------------------------------------------------------

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    let unsub: (() => void) | undefined
    let live = true
    void db().then((sb) => {
      if (!live) return
      void sb.auth.getSession().then(({ data }) => live && setSession(data.session))
      const { data } = sb.auth.onAuthStateChange((_e, s) => live && setSession(s))
      unsub = () => data.subscription.unsubscribe()
    })
    return () => {
      live = false
      unsub?.()
    }
  }, [])
  return session
}

export async function signIn(email: string, password: string) {
  const { error } = await (await db()).auth.signInWithPassword({ email, password })
  if (error) throw new TicketError('Wrong email or password.')
}

export async function signOut() {
  await (await db()).auth.signOut()
}

export async function isAdmin() {
  return call<boolean>('is_admin')
}

export async function listOrders(): Promise<Order[]> {
  return (await call<RawOrder[]>('admin_list_orders')).map(toOrder)
}

export async function confirmOrder(ref: string) {
  return toOrder(await call<RawOrder>('admin_confirm', { p_ref: ref }))
}

/** Emails the buyer their invoice (supabase/functions/send-invoice). Confirmed orders only. */
export async function sendInvoice(ref: string): Promise<Order> {
  const { data, error } = await (await db()).functions.invoke<{ order?: RawOrder; error?: string }>(
    'send-invoice',
    { body: { ref } },
  )
  if (error) {
    // The function's own { error } message, when it sent one.
    let msg = 'Couldn’t send the invoice. Try again.'
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) msg = body.error
    } catch {
      /* not JSON — function not deployed, offline, etc. */
    }
    throw new TicketError(msg)
  }
  if (!data?.order) throw new TicketError('Couldn’t send the invoice. Try again.')
  return toOrder(data.order)
}

export async function rejectOrder(ref: string) {
  return toOrder(await call<RawOrder>('admin_reject', { p_ref: ref }))
}

export type SalesRow = {
  nightId: string
  title: string
  tierName: string
  capacity: number
  sold: number
  held: number
}

export async function salesSummary() {
  return call<SalesRow[]>('admin_sales')
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  awaiting_confirmation: 'Checking payment',
  confirmed: 'Confirmed',
  rejected: 'Payment not found',
  expired: 'Expired',
}

// ---- door ------------------------------------------------------------------

export type DoorCounts = { checkedIn: number; total: number }

export type ScannedTicket = {
  code: string
  nightId: string
  tierId: string
  title: string
  tierName: string
  holder: string
  ref: string
  orderStatus: OrderStatus
  checkedInAt: string | null
}

export type CheckInResult =
  | { result: 'ok' | 'already' | 'wrong_event' | 'not_valid'; ticket: ScannedTicket; counts: DoorCounts }
  | { result: 'not_found'; code: string; counts: DoorCounts }

/** Marks a ticket used. Only `ok` changes anything; every other result is a warning. */
export async function checkIn(code: string, nightId: string) {
  return call<CheckInResult>('admin_check_in', { p_code: code, p_event: nightId })
}

export async function undoCheckIn(code: string, nightId: string) {
  return call<DoorCounts>('admin_undo_check_in', { p_code: code, p_event: nightId })
}

export async function doorCounts(nightId: string) {
  return call<DoorCounts>('admin_door_counts', { p_event: nightId })
}
