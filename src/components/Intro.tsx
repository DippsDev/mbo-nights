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

  const enter = () => {
    if (out) return
    window.scrollTo(0, 0)
    start()
    dismiss()
  }

  if (!show) return null

  return (
    <div
      className={`intro${out ? ' is-out' : ''}`}
      role="button"
      tabIndex={0}
      onPointerDown={enter}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') enter()
      }}
    >
      <span>MBO</span>
      <small>Enter</small>
    </div>
  )
}
