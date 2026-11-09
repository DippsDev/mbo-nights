import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
gsap.config({ force3D: true, nullTargetWarn: false })
ScrollTrigger.config({
  ignoreMobileResize: true,
})

/**
 * Deliberately ignores the OS `prefers-reduced-motion` setting: Windows often
 * reports it (Animation effects off / best-performance mode) and it was
 * switching off the menu, page transitions and scroll motion site-wide.
 */
export function reducedMotion() {
  return false
}

/**
 * True when *any* attached input is a mouse/trackpad. The primary-input queries
 * (`pointer` / `hover`) report coarse/none on many Windows touchscreen laptops even
 * though a trackpad or mouse is in use, so we check every input instead.
 */
export const MOUSE_MQ = '(any-pointer: fine) and (any-hover: hover)'

export function finePointer() {
  return window.matchMedia(MOUSE_MQ).matches
}

export function isNarrow() {
  return window.matchMedia('(max-width: 799px)').matches
}

/**
 * Simple scroll reveal: each element fades up once as it enters the viewport.
 * Time-based (not scrubbed), so it never fights the scroll position.
 */
export function softScrollReveal(
  roots: Element | Element[] | NodeListOf<Element> | string,
  scope?: Element | string | object,
) {
  if (reducedMotion()) return () => undefined

  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>(roots).forEach((el) => {
      gsap.from(el, {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          once: true,
        },
      })
    })
  }, scope)

  return () => ctx.revert()
}
