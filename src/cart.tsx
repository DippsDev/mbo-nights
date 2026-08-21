import {
  createContext,
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

type CartContextValue = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void
  remove: (key: string) => void
  clear: () => void
  count: number
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const value = useMemo<CartContextValue>(() => {
    const add: CartContextValue['add'] = (item) => {
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
      remove: (key) => setItems((prev) => prev.filter((p) => p.key !== key)),
      clear: () => setItems([]),
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.price * i.qty, 0),
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
