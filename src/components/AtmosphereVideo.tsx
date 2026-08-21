import { useEffect, useMemo, useRef, useState } from 'react'
import { reducedMotion } from '../lib/motion'

const RATE_DESKTOP = 0.88
const CROSSFADE = 0.7

function mobileFriendly() {
  return window.matchMedia('(max-width: 799px), (pointer: coarse)').matches
}

export default function AtmosphereVideo({
  poster,
  clips,
  posters = [],
  alt,
  cover = false,
  playing = true,
  eager = false,
}: {
  poster?: string
  clips: readonly string[]
  posters?: readonly string[]
  alt: string
  cover?: boolean
  playing?: boolean
  eager?: boolean
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const aRef = useRef<HTMLVideoElement>(null)
  const bRef = useRef<HTMLVideoElement>(null)
  const cueing = useRef(false)
  const index = useRef(0)
  const frontRef = useRef(0)
  const [failed, setFailed] = useState<Record<string, true>>({})
  const [inView, setInView] = useState(eager)
  const [front, setFront] = useState(0)
  const [live, setLive] = useState(false)
  const [still, setStill] = useState(0)
  const motionOff = reducedMotion()
  const playable = useMemo(
    () => clips.filter((src) => src && !failed[src]),
    [clips, failed],
  )
  const stills = useMemo(
    () => (posters.length > 0 ? posters : poster ? [poster] : []),
    [poster, posters],
  )
  const useVideo = playable.length > 0 && !motionOff
  const active = playing && (eager || inView)

  useEffect(() => {
    frontRef.current = front
  }, [front])

  useEffect(() => {
    const el = wrap.current
    if (!el || eager) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05, rootMargin: '80px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [eager])

  useEffect(() => {
    if (useVideo || !playing || stills.length < 2 || motionOff) return
    const id = window.setInterval(() => {
      setStill((n) => (n + 1) % stills.length)
    }, 7200)
    return () => window.clearInterval(id)
  }, [useVideo, playing, stills.length, motionOff])

  useEffect(() => {
    const a = aRef.current
    if (!useVideo || !a || !playable[0]) return

    const rate = mobileFriendly() ? 1 : RATE_DESKTOP
    const arm = (video: HTMLVideoElement, src: string, loop: boolean) => {
      video.muted = true
      video.defaultMuted = true
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', '')
      video.loop = loop
      video.playbackRate = rate
      if (video.getAttribute('src') !== src) video.src = src
    }

    arm(a, playable[0], playable.length === 1)
    if (bRef.current && playable[1]) arm(bRef.current, playable[1], false)
    index.current = 0
    cueing.current = false
    setFront(0)
    frontRef.current = 0

    const onPlay = () => setLive(true)
    a.addEventListener('playing', onPlay)
    return () => a.removeEventListener('playing', onPlay)
  }, [useVideo, playable])

  useEffect(() => {
    const layer = front === 0 ? aRef.current : bRef.current
    const other = front === 0 ? bRef.current : aRef.current
    if (!useVideo || !layer) return

    if (!active) {
      layer.pause()
      other?.pause()
      return
    }

    layer.muted = true
    layer.playbackRate = mobileFriendly() ? 1 : RATE_DESKTOP
    void layer.play().catch(() => undefined)
  }, [active, front, useVideo])

  useEffect(() => {
    const kick = () => {
      if (!playing) return
      const layer = frontRef.current === 0 ? aRef.current : bRef.current
      if (!layer) return
      layer.muted = true
      void layer.play().catch(() => undefined)
    }
    window.addEventListener('pointerdown', kick, true)
    window.addEventListener('touchstart', kick, { capture: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', kick, true)
      window.removeEventListener('touchstart', kick, true)
    }
  }, [playing])

  const cueNext = (from: HTMLVideoElement) => {
    if (playable.length < 2 || cueing.current) return
    const left = from.duration - from.currentTime
    if (!Number.isFinite(left) || left > CROSSFADE) return

    cueing.current = true
    const next = (index.current + 1) % playable.length
    const hidden = frontRef.current ^ 1
    const other = hidden === 0 ? aRef.current : bRef.current
    if (!other) {
      cueing.current = false
      return
    }

    other.src = playable[next]
    other.loop = false
    other.muted = true
    other.playbackRate = mobileFriendly() ? 1 : RATE_DESKTOP
    void other.play().catch(() => undefined)
    index.current = next
    frontRef.current = hidden
    setFront(hidden)
    window.setTimeout(() => {
      cueing.current = false
    }, CROSSFADE * 1000 + 80)
  }

  const onError = (src: string) => {
    if (!src) return
    setFailed((prev) => (prev[src] ? prev : { ...prev, [src]: true }))
  }

  return (
    <div
      ref={wrap}
      className={`atmosphere${cover ? ' cover' : ''}${live ? ' is-live' : ''}`}
    >
      {stills.map((src, i) => (
        <img
          key={src + i}
          className={`atmosphere-still${i === still ? ' on' : ''}`}
          src={src}
          alt={i === still ? alt : ''}
        />
      ))}
      {useVideo && (
        <>
          <video
            ref={aRef}
            className={front === 0 ? 'on' : ''}
            muted
            playsInline
            autoPlay={eager}
            preload="auto"
            loop={playable.length === 1}
            src={playable[0]}
            onTimeUpdate={(event) => cueNext(event.currentTarget)}
            onError={() => onError(playable[0])}
          />
          {playable.length > 1 && (
            <video
              ref={bRef}
              className={front === 1 ? 'on' : ''}
              muted
              playsInline
              preload="auto"
              src={playable[1]}
              onTimeUpdate={(event) => cueNext(event.currentTarget)}
              onError={() => playable[1] && onError(playable[1])}
            />
          )}
        </>
      )}
      <span className="atmosphere-veil" aria-hidden />
    </div>
  )
}
