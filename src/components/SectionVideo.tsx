import { useEffect, useState } from 'react'
import { forceMuted, useMutedVideoRef } from '../lib/media'
import { reducedMotion } from '../lib/motion'

/**
 * Muted background loop for a home section. Loads nothing until the section nears
 * the viewport, then loops continuously, and falls back to `image` if the
 * file is missing or the visitor prefers reduced motion.
 */
export default function SectionVideo({
  src,
  image,
  focus,
}: {
  src: string
  image: string
  focus?: string
}) {
  const [ref, attach] = useMutedVideoRef()
  const [near, setNear] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const still = reducedMotion()
  const poster = src.replace(/\.mp4$/i, '.jpg')

  useEffect(() => {
    const video = ref.current
    if (!video || still) return

    // Once started it keeps looping off screen, like the hero, so scrolling back
    // never lands on a frozen frame.
    const play = () => {
      if (!video.src) return
      forceMuted(video)
      if (video.paused) void video.play().catch(() => undefined)
    }
    // Start loading a screen before the section arrives.
    const warm = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true)
      },
      { rootMargin: '300px 0px' },
    )
    // Some browsers (iOS Safari) pause off-screen video themselves; nudge it on return.
    const view = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) play()
    })
    warm.observe(video)
    view.observe(video)
    const onVis = () => {
      if (document.visibilityState === 'visible') play()
    }
    video.addEventListener('loadeddata', play)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      warm.disconnect()
      view.disconnect()
      video.removeEventListener('loadeddata', play)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ref, still])

  if (still || failed) return <img src={image} alt="" loading="lazy" decoding="async" />

  return (
    <video
      ref={attach}
      className={ready ? 'is-ready' : undefined}
      src={near ? src : undefined}
      poster={poster}
      style={focus ? { objectPosition: focus } : undefined}
      muted
      playsInline
      loop
      preload={near ? 'auto' : 'none'}
      aria-hidden
      onLoadedData={() => setReady(true)}
      onError={() => setFailed(true)}
    />
  )
}
