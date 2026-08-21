export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function finePointer() {
  return window.matchMedia('(pointer: fine)').matches
}

export function isNarrow() {
  return window.matchMedia('(max-width: 799px)').matches
}
