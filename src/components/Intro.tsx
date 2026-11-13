import { useCallback, useEffect, useRef, useState } from 'react'
import { useSound } from '../sound'

function lockPageScroll() {
  const y = window.scrollY
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${y}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  return y
}

function unlockPageScroll() {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
}

function forceHeroTop() {
  unlockPageScroll()
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo(0, 0)
}

export default function Intro() {
  const { start } = useSound()
  const [show, setShow] = useState(true)
  const [out, setOut] = useState(false)
  const entered = useRef(false)

  useEffect(() => {
    // Keep the splash at the hero — don't let the page scroll underneath.
    window.scrollTo(0, 0)
    lockPageScroll()
    return () => unlockPageScroll()
  }, [])

  const enter = useCallback(() => {
    if (entered.current) return
    entered.current = true
    // Enter fires on pointerdown, so the tap's click lands after the splash starts
    // fading — on whatever sits underneath (the hero "Get tickets" link on phones).
    // Swallow that one click so Enter only ever opens the home page.
    const swallow = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('click', swallow, { capture: true, once: true })
    window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 1000)
    start()
    forceHeroTop()
    setOut(true)
    window.dispatchEvent(new CustomEvent('mbo:entered'))
    requestAnimationFrame(() => {
      forceHeroTop()
      requestAnimationFrame(forceHeroTop)
    })
    window.setTimeout(forceHeroTop, 100)
    window.setTimeout(() => {
      forceHeroTop()
      setShow(false)
    }, 700)
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
      <p className="intro-age">
        Strictly <b>18+</b>
      </p>
      <small>Enter</small>
    </div>
  )
}
