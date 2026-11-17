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
  // In-app browsers (TikTok, Instagram on iOS) ignore `playsinline` and go fullscreen without the prefixed one.
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
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
    if (!el) return
    forceMuted(el)
    // iOS pauses a video when the viewer leaves native fullscreen; resume the background loop.
    el.addEventListener('webkitendfullscreen', () => void el.play().catch(() => {}))
  }, [])
  return [ref, attach] as const
}
