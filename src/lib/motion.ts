import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
gsap.config({ force3D: true, nullTargetWarn: false })
ScrollTrigger.config({
  ignoreMobileResize: true,
})

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

/**
 * Light fade-up for mobile / coarse pointers.
 * Once-play (no scrub) — scrub fights native momentum scrolling and causes stutters.
 */
export function softScrollReveal(
  roots: Element | Element[] | NodeListOf<Element> | string,
  scope?: Element | string | object,
) {
  if (reducedMotion()) return () => undefined

  const targets =
    typeof roots === 'string'
      ? gsap.utils.toArray<HTMLElement>(roots)
      : gsap.utils.toArray<HTMLElement>(roots)

  const ctx = gsap.context(() => {
    targets.forEach((el) => {
      gsap.fromTo(
        el,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          force3D: true,
          scrollTrigger: {
            trigger: el,
            start: 'top 94%',
            toggleActions: 'play none none none',
            once: true,
            // Don't invalidate on every mobile chrome resize.
            fastScrollEnd: true,
          },
        },
      )
    })
  }, scope)

  return () => ctx.revert()
}
