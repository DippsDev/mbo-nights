import { useEffect, useMemo, useRef, useState } from 'react'
import { reducedMotion } from '../lib/motion'

const RATE = 0.88
const CROSSFADE = 0.7
const STILL_MS = 7200

function usePlayable(clips: readonly string[]) {
  const [ready, setReady] = useState<string[]>([])
  const clipKey = clips.join('\n')

  useEffect(() => {
    const sources = clipKey.split('\n').filter(Boolean)
    if (sources.length === 0) {
      setReady([])
      return
    }
    let cancelled = false
    const nodes: HTMLVideoElement[] = []

    Promise.all(
      sources.map(
        (src) =>
          new Promise<string | null>((resolve) => {
            const video = document.createElement('video')
            nodes.push(video)
            video.muted = true
            video.preload = 'metadata'
            video.playsInline = true
            const finish = (ok: boolean) => {
              video.onloadedmetadata = null
              video.onerror = null
              video.removeAttribute('src')
              video.load()
              resolve(ok ? src : null)
            }
            video.onloadedmetadata = () => finish(true)
            video.onerror = () => finish(false)
            video.src = src
          }),
      ),
    ).then((found) => {
      if (!cancelled) setReady(found.filter((src): src is string => Boolean(src)))
    })

    return () => {
      cancelled = true
      nodes.forEach((video) => {
        video.onloadedmetadata = null
        video.onerror = null
        video.removeAttribute('src')
        video.load()
      })
    }
  }, [clipKey])

  return ready
}

export default function AtmosphereVideo({
  poster,
  clips,
  posters = [],
  alt,
  cover = false,
  playing = true,
}: {
  poster: string
  clips: readonly string[]
  posters?: readonly string[]
  alt: string
  cover?: boolean
  playing?: boolean
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const layers = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)]
  const cueing = useRef(false)
  const index = useRef(0)
  const playable = usePlayable(clips)
  const stills = useMemo(
    () => (posters.length > 0 ? posters : [poster]),
    [poster, posters],
  )
  const [inView, setInView] = useState(false)
  const [front, setFront] = useState(0)
  const [live, setLive] = useState(false)
  const [still, setStill] = useState(0)
  const motionOff = reducedMotion()
  const useVideo = playable.length > 0 && !motionOff
  const active = playing && inView

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.18),
      { threshold: [0, 0.18, 0.4] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (useVideo || !playing || stills.length < 2 || motionOff) return
    const id = window.setInterval(() => {
      setStill((n) => (n + 1) % stills.length)
    }, STILL_MS)
    return () => window.clearInterval(id)
  }, [useVideo, playing, stills.length, motionOff])

  useEffect(() => {
    if (!useVideo) {
      setLive(false)
      layers.forEach((layer) => layer.current?.pause())
      return
    }

    const a = layers[0].current
    const b = layers[1].current
    if (!a) return

    const arm = (video: HTMLVideoElement, src: string) => {
      if (video.getAttribute('src') !== src) video.src = src
      video.loop = playable.length === 1
      video.muted = true
      video.playsInline = true
      video.playbackRate = RATE
    }

    arm(a, playable[0])
    if (b && playable[1]) arm(b, playable[1])
    index.current = 0
    cueing.current = false
    setFront(0)

    const onPlay = () => setLive(true)
    a.addEventListener('playing', onPlay)
    return () => a.removeEventListener('playing', onPlay)
  }, [useVideo, playable])

  useEffect(() => {
    const a = layers[front].current
    const b = layers[front ^ 1].current
    if (!useVideo || !a) return

    if (!active) {
      a.pause()
      b?.pause()
      return
    }

    a.muted = true
    a.playbackRate = RATE
    void a.play().catch(() => undefined)
  }, [active, front, useVideo])

  const cueNext = (from: HTMLVideoElement) => {
    if (playable.length < 2 || cueing.current) return
    const left = from.duration - from.currentTime
    if (!Number.isFinite(left) || left > CROSSFADE) return

    cueing.current = true
    const next = (index.current + 1) % playable.length
    const hidden = front ^ 1
    const other = layers[hidden].current
    if (!other) {
      cueing.current = false
      return
    }

    other.src = playable[next]
    other.loop = false
    other.muted = true
    other.playbackRate = RATE
    void other.play().catch(() => undefined)
    index.current = next
    setFront(hidden)
    window.setTimeout(() => {
      cueing.current = false
    }, CROSSFADE * 1000 + 80)
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
      {useVideo &&
        [0, 1].map((layer) => (
          <video
            key={layer}
            ref={layers[layer]}
            className={layer === front ? 'on' : ''}
            muted
            playsInline
            preload="auto"
            onTimeUpdate={(event) => cueNext(event.currentTarget)}
          />
        ))}
      <span className="atmosphere-veil" aria-hidden />
    </div>
  )
}
