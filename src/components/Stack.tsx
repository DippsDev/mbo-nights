import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'

/*
 * Swipeable card stack, adapted from React Bits "Stack" (reactbits.dev).
 * Drag the top card past `sensitivity` px, or tap it, to send it to the back.
 * The last card in `order` is the one on top.
 */

export type StackCard = { id: string; content: ReactNode }
export type StackHandle = { next: () => void; prev: () => void; bringToTop: (id: string) => void }

type Props = {
  cards: StackCard[]
  width: string
  height: string
  /** Drag distance (px) that sends the top card to the back. */
  sensitivity?: number
  /** Called with the id of the card now on top. */
  onTopChange?: (id: string) => void
  ref?: Ref<StackHandle>
}

export default function Stack({ cards, width, height, sensitivity = 90, onTopChange, ref }: Props) {
  // First card in `cards` starts on top.
  const [order, setOrder] = useState(() => [...cards].reverse().map((c) => c.id))

  const apply = (next: string[]) => {
    setOrder(next)
    onTopChange?.(next[next.length - 1])
  }
  const sendToBack = () => apply([order[order.length - 1], ...order.slice(0, -1)])
  const bringBack = () => apply([...order.slice(1), order[0]])

  const bringToTop = (id: string) => {
    if (order[order.length - 1] !== id) apply([...order.filter((x) => x !== id), id])
  }

  useImperativeHandle(ref, () => ({ next: sendToBack, prev: bringBack, bringToTop }))

  return (
    <div className="stack" style={{ width, height }}>
      {order.map((id, index) => {
        const card = cards.find((c) => c.id === id)
        if (!card) return null
        const depth = order.length - index - 1
        const top = depth === 0
        return (
          <DragCard key={id} active={top} sensitivity={sensitivity} onSendToBack={sendToBack}>
            <motion.div
              className="stack-card"
              aria-hidden={!top}
              initial={false}
              // Every card fans out from its bottom edge. Clockwise, so the fan opens
              // to the right, away from the category tabs on the left.
              animate={{
                rotateZ: depth * 3,
                scale: 1 - depth * 0.05,
                y: depth * 10,
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ transformOrigin: '50% 100%' }}
            >
              {card.content}
            </motion.div>
          </DragCard>
        )
      })}
    </div>
  )
}

function DragCard({
  active,
  sensitivity,
  onSendToBack,
  children,
}: {
  active: boolean
  sensitivity: number
  onSendToBack: () => void
  children: ReactNode
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  // Gentle tilt so the text stays readable while dragging.
  const rotateX = useTransform(y, [-120, 120], [18, -18])
  const rotateY = useTransform(x, [-120, 120], [-18, 18])
  const dragged = useRef(false)

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) {
      onSendToBack()
    }
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      className="stack-drag"
      style={{ x, y, rotateX, rotateY, pointerEvents: active ? 'auto' : 'none' }}
      drag={active}
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={active ? { cursor: 'grabbing' } : undefined}
      onDragStart={() => {
        dragged.current = true
      }}
      onDragEnd={onDragEnd}
      onClick={() => {
        // A short drag that snaps back still ends in a click; ignore it.
        if (dragged.current) {
          dragged.current = false
          return
        }
        if (active) onSendToBack()
      }}
    >
      {children}
    </motion.div>
  )
}
