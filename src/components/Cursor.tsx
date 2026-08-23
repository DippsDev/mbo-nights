import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const glow = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!finePointer() || reducedMotion()) return

    document.documentElement.classList.add('has-cursor')
    let x = 0
    let y = 0
    let rx = 0
    let ry = 0
    let gx = 0
    let gy = 0
    let frame = 0
    let moving = false

    const place = (el: HTMLDivElement | null, px: number, py: number) => {
      if (el) el.style.transform = `translate3d(${px}px, ${py}px, 0)`
    }

    const tick = () => {
      rx += (x - rx) * 0.2
      ry += (y - ry) * 0.2
      gx += (x - gx) * 0.12
      gy += (y - gy) * 0.12
      place(ring.current, rx, ry)
      place(glow.current, gx, gy)
      if (
        Math.abs(x - rx) < 0.15 &&
        Math.abs(y - ry) < 0.15 &&
        Math.abs(x - gx) < 0.4 &&
        Math.abs(y - gy) < 0.4
      ) {
        moving = false
        return
      }
      frame = requestAnimationFrame(tick)
    }

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      place(dot.current, x, y)
      if (!moving) {
        moving = true
        frame = requestAnimationFrame(tick)
      }
    }

    window.addEventListener('pointermove', move, { passive: true })

    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="cursor-glow" ref={glow} aria-hidden />
      <div className="cursor-dot" ref={dot} />
      <div className="cursor-ring" ref={ring} />
    </>
  )
}
