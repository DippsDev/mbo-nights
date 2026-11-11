import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type CartItem = {
  key: string
  kind: 'ticket' | 'merch'
  refId: string
  name: string
  detail: string
  price: number
  qty: number
  image: string
}

/** What the bag slip under the header shows after an add attempt. */
export type BagNotice = {
  id: number
  kind: 'added' | 'limit'
  title: string
  detail?: string
}

type CartContextValue = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void
  /** Show a slip without adding anything (e.g. hit the per-tier limit). */
  notify: (kind: BagNotice['kind'], title: string, detail?: string) => void
  notice: BagNotice | null
  dismissNotice: () => void
  remove: (key: string) => void
  setQty: (key: string, qty: number) => void
  clear: () => void
  count: number
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [notice, setNotice] = useState<BagNotice | null>(null)

  const notify = useCallback<CartContextValue['notify']>((kind, title, detail) => {
    setNotice({ id: Date.now(), kind, title, detail })
  }, [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const value = useMemo<CartContextValue>(() => {
    const add: CartContextValue['add'] = (item) => {
      notify('added', item.name, item.detail)
      setItems((prev) => {
        const existing = prev.find((p) => p.key === item.key)
        if (existing) {
          return prev.map((p) =>
            p.key === item.key ? { ...p, qty: p.qty + (item.qty ?? 1) } : p,
          )
        }
        return [...prev, { ...item, qty: item.qty ?? 1 }]
      })
    }

    return {
      items,
      add,
      notify,
      notice,
      dismissNotice,
      remove: (key) => setItems((prev) => prev.filter((p) => p.key !== key)),
      setQty: (key, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => p.key !== key)
            : prev.map((p) => (p.key === key ? { ...p, qty } : p)),
        ),
      clear: () => setItems([]),
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.price * i.qty, 0),
    }
  }, [items, notice, notify, dismissNotice])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
