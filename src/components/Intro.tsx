import { useCallback, useRef, useState } from 'react'
import { useSound } from '../sound'

export default function Intro() {
  const { start } = useSound()
  const [show, setShow] = useState(true)
  const [out, setOut] = useState(false)
  const entered = useRef(false)

  const enter = useCallback(() => {
    if (entered.current) return
    entered.current = true
    // First line in the gesture stack — required for iOS audio unlock.
    start()
    window.scrollTo(0, 0)
    setOut(true)
    window.setTimeout(() => setShow(false), 700)
  }, [start])

  if (!show) return null

  return (
    <div
      className={`intro${out ? ' is-out' : ''}`}
      role="button"
      tabIndex={0}
      onPointerDown={enter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          enter()
        }
      }}
    >
      <span>MBO</span>
      <small>Enter</small>
    </div>
  )
}
