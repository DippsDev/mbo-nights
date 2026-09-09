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

function revealIfAlreadyInView(el: HTMLElement, self: ScrollTrigger) {
  const viewH =
    self.scroller === window ? window.innerHeight : (self.scroller as Element).clientHeight
  if (self.progress === 1 || self.start < self.scroll() + viewH) {
    self.animation?.progress(1)
    gsap.set(el, { clearProps: 'opacity,transform' })
  }
}

/**
 * Light fade-up for mobile / coarse pointers.
 * Once-play only — and snap to visible if already on screen so sections never stay ghosted.
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
      const tween = gsap.fromTo(
        el,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          force3D: true,
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            start: 'top 96%',
            toggleActions: 'play none none none',
            once: true,
            fastScrollEnd: true,
            onRefresh(self) {
              revealIfAlreadyInView(el, self)
            },
          },
        },
      )

      const st = tween.scrollTrigger
      if (st) revealIfAlreadyInView(el, st)
    })
  }, scope)

  return () => ctx.revert()
}
