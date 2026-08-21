import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!finePointer() || reducedMotion()) return

    document.documentElement.classList.add('has-cursor')
    let x = 0
    let y = 0
    let rx = 0
    let ry = 0
    let frame = 0

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (dot.current) {
        dot.current.style.transform = `translate(${x}px, ${y}px)`
      }
    }

    const tick = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      if (ring.current) {
        ring.current.style.transform = `translate(${rx}px, ${ry}px)`
      }
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', move)
    frame = requestAnimationFrame(tick)

    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="cursor-dot" ref={dot} />
      <div className="cursor-ring" ref={ring} />
    </>
  )
}
