import { useCallback, useState } from 'react'
import { useSound } from '../sound'

export default function Intro() {
  const { start } = useSound()
  const [show, setShow] = useState(true)
  const [out, setOut] = useState(false)

  const dismiss = useCallback(() => {
    setOut(true)
    window.setTimeout(() => setShow(false), 700)
  }, [])

  const enter = useCallback(() => {
    if (out) return
    window.scrollTo(0, 0)
    // Must stay inside the user-gesture stack for iOS audio unlock.
    start()
    dismiss()
  }, [dismiss, out, start])

  if (!show) return null

  return (
    <div
      className={`intro${out ? ' is-out' : ''}`}
      role="button"
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault()
        enter()
      }}
      onClick={enter}
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
