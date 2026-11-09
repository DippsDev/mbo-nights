/**
 * Ticketing data layer — talks to the Supabase functions in
 * supabase/migrations/0001_ticketing.sql. The database is the source of truth
 * for price, stock and order state; data.ts only supplies images and copy.
 */
import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export { TICKETS_ENABLED } from './flags'

export const PAY2CELL = {
  number: import.meta.env.VITE_PAY2CELL_NUMBER || '7X XXX XXX',
  name: import.meta.env.VITE_PAY2CELL_NAME || 'MBO Nights',
}

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
  'createdAt' | 'expiresAt' | 'reportedPaidAt' | 'resolvedAt' | 'paymentNote' | 'tickets'
> & {
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
    paymentNote: raw.paymentNote ?? undefined,
    tickets: raw.tickets.map((t) => ({ ...t, checkedInAt: ms(t.checkedInAt) })),
  }
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
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

export async function fetchStock(): Promise<Stock> {
  const rows = await call<
    { event_id: string; tier_id: string; name: string; price: number; remaining: number }[]
  >('tier_stock')
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
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new TicketError('Wrong email or password.')
}

export async function signOut() {
  await supabase.auth.signOut()
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
