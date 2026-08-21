import { useCallback, useEffect, useState } from 'react'
import { reducedMotion } from '../lib/motion'
import { useSound } from '../sound'

export default function Intro() {
  const { start, live } = useSound()
  const [show, setShow] = useState(true)
  const [out, setOut] = useState(false)

  const dismiss = useCallback(() => {
    setOut(true)
    window.setTimeout(() => setShow(false), 700)
  }, [])

  const enter = () => {
    start()
    dismiss()
  }

  useEffect(() => {
    if (!live || !show || out) return
    const wait = reducedMotion() ? 200 : 1600
    const t = window.setTimeout(dismiss, wait)
    return () => window.clearTimeout(t)
  }, [live, show, out, dismiss])

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
      {!live && <small>Enter</small>}
    </div>
  )
}
