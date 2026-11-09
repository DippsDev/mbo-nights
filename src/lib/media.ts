import { useCallback, useRef } from 'react'

/**
 * React sets `muted` as a property only. iOS Safari reads the *attribute* to decide
 * whether a video may take over the audio session — without it, playing a hero clip
 * pauses the site's sound bed. Call before every play().
 */
export function forceMuted(video: HTMLVideoElement) {
  video.muted = true
  video.defaultMuted = true
  video.setAttribute('muted', '')
}

/**
 * Ref for a background <video> that marks it muted the moment React creates the
 * element — before it can load or play. Pair with no `autoPlay` and an explicit
 * play() in an effect, so a returning-to-home remount never interrupts the music.
 */
export function useMutedVideoRef() {
  const ref = useRef<HTMLVideoElement | null>(null)
  const attach = useCallback((el: HTMLVideoElement | null) => {
    ref.current = el
    if (el) forceMuted(el)
  }, [])
  return [ref, attach] as const
}
