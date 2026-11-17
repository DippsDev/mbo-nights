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
    const stop = keepPlaying(el)
    return () => {
      stop()
      ref.current = null
    }
  }, [])
  return [ref, attach] as const
}

const WATCH_MS = 2000

/**
 * Watchdog for background loops: while the video is on screen and the tab is visible,
 * restart it if the browser paused it (low power, memory, audio session) or if playback
 * stalled on a slow network. Off-screen pauses by the pages are left alone.
 */
export function keepPlaying(video: HTMLVideoElement) {
  // Any play() there opens fullscreen; those pages show the clip as an <img> instead.
  if (NO_INLINE_VIDEO) return () => {}
  let visible = false
  let last = -1
  const io = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting)
  })
  io.observe(video)
  const timer = window.setInterval(() => {
    if (document.hidden || !visible || !video.currentSrc) {
      last = -1
      return
    }
    forceMuted(video)
    if (video.paused) {
      void video.play().catch(() => undefined)
    } else if (video.currentTime === last) {
      // Stuck for a full interval: drop the stalled request and start the loop again.
      video.load()
      void video.play().catch(() => undefined)
    }
    last = video.currentTime
  }, WATCH_MS)
  return () => {
    window.clearInterval(timer)
    io.disconnect()
  }
}

/**
 * TikTok's iOS in-app browser disables inline playback for the whole webview, so any
 * play() opens native fullscreen no matter what attributes the video has. Show stills there.
 */
export const NO_INLINE_VIDEO =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  /musical_ly|BytedanceWebview|TikTok|trill_/i.test(navigator.userAgent)
