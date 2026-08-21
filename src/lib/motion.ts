import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
gsap.config({ force3D: true, nullTargetWarn: false })
ScrollTrigger.config({ ignoreMobileResize: true })

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function finePointer() {
  return window.matchMedia('(pointer: fine)').matches
}

export function isNarrow() {
  return window.matchMedia('(max-width: 799px)').matches
}

/** Skip heavy scroll effects on phones, tablets, and reduced-motion. */
export function cheapMotion() {
  return (
    reducedMotion() ||
    window.matchMedia('(pointer: coarse), (hover: none), (max-width: 1199px)').matches
  )
}
