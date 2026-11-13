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
 * Pure CSS transition (`.reveal` / `.is-in` in index.css) toggled by an
 * IntersectionObserver — no animation library on the critical path.
 */
export function softScrollReveal(
  roots: Element | Element[] | NodeListOf<Element> | string,
  scope?: Element | string,
) {
  if (reducedMotion()) return () => undefined

  const base: ParentNode =
    typeof scope === 'string' ? (document.querySelector(scope) ?? document) : (scope ?? document)
  const els: Element[] =
    typeof roots === 'string'
      ? Array.from(base.querySelectorAll(roots))
      : roots instanceof Element
        ? [roots]
        : Array.from(roots)

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  )
  for (const el of els) {
    el.classList.add('reveal')
    io.observe(el)
  }

  return () => {
    io.disconnect()
    for (const el of els) el.classList.remove('reveal', 'is-in')
  }
}
