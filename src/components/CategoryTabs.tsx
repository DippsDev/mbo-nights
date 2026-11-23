import { motion } from 'motion/react'
import { reducedMotion } from '../lib/motion'

/*
 * Menu categories as a strip of tear-off ticket cells, joined by dashed
 * perforations. An acid block springs from cell to cell under the active one.
 * Controlled: the parent owns `active`, so the block also moves on a swipe.
 */

type Props = {
  items: string[]
  active: number
  onSelect: (index: number) => void
  label: string
}

export default function CategoryTabs({ items, active, onSelect, label }: Props) {
  const reduce = reducedMotion()

  return (
    <nav className="cat-tabs" aria-label={label}>
      <ul>
        {items.map((item, i) => {
          const on = i === active
          return (
            <li key={item}>
              <motion.button
                type="button"
                className={on ? 'is-active' : undefined}
                aria-current={on ? 'true' : undefined}
                onClick={() => onSelect(i)}
                whileTap={reduce ? undefined : { scale: 0.94 }}
              >
                {on && (
                  <motion.span
                    className="cat-tabs-block"
                    layoutId="cat-tabs-block"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 34 }}
                    aria-hidden
                  />
                )}
                <span className="cat-tabs-num" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="cat-tabs-label">{item}</span>
              </motion.button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
