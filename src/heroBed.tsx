import { createContext, useContext, type ReactNode } from 'react'

type HeroBedValue = {
  playing: boolean
  toggle: () => void
}

const HeroBedContext = createContext<HeroBedValue | null>(null)

export function HeroBedProvider({
  playing,
  toggle,
  children,
}: HeroBedValue & { children: ReactNode }) {
  return (
    <HeroBedContext.Provider value={{ playing, toggle }}>{children}</HeroBedContext.Provider>
  )
}

export function useHeroBed() {
  const ctx = useContext(HeroBedContext)
  if (!ctx) throw new Error('useHeroBed must be used inside HeroBedProvider')
  return ctx
}
