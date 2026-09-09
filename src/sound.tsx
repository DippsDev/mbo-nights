import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type SoundContextValue = {
  on: boolean
  live: boolean
  toggle: () => void
  start: () => void
}

const SoundContext = createContext<SoundContextValue | null>(null)

const TRACK = '/audio/DippsDev.mp3'
const START_AT = 8
const FILE_VOL = 0.55
const FADE_OUT = 0.9

class Bed {
  file: HTMLAudioElement
  wanted = true
  private fileFade = 0
  private fading = false
  private sought = false

  constructor(file: HTMLAudioElement) {
    this.file = file
    this.file.loop = false
    this.file.preload = 'auto'
    this.file.muted = false
    this.file.setAttribute('playsinline', '')
    this.file.setAttribute('webkit-playsinline', '')
    this.file.volume = FILE_VOL
    this.primeSeek()
  }

  live() {
    return !this.file.paused && !this.file.ended
  }

  /** Seek while paused (safe on iOS). Never seek in the same turn as play(). */
  private primeSeek() {
    const el = this.file
    const apply = () => {
      if (this.sought || !el.paused) return
      try {
        el.currentTime = START_AT
        this.sought = true
      } catch {
        /* ignore */
      }
    }
    if (el.readyState >= 1) apply()
    else el.addEventListener('loadedmetadata', apply, { once: true })
    el.load()
  }

  seekStart(force = false) {
    if (this.sought && !force) return
    if (force) this.sought = false
    const el = this.file
    const apply = () => {
      try {
        el.currentTime = START_AT
        this.sought = true
      } catch {
        /* ignore */
      }
    }
    if (el.readyState >= 1) apply()
    else el.addEventListener('loadedmetadata', apply, { once: true })
  }

  tryAutoplay() {
    this.wanted = true
    void this.file.play().catch(() => undefined)
  }

  /**
   * Call synchronously from a tap/click. Do not seek before play on iOS —
   * that cancels the gesture unlock.
   */
  play() {
    this.wanted = true
    const el = this.file
    el.muted = false
    el.volume = FILE_VOL
    cancelAnimationFrame(this.fileFade)
    this.fading = false

    const req = el.play()

    if (req !== undefined) {
      void req
        .then(() => {
          // Seek only after playback is actually running.
          if (!this.sought && el.currentTime < START_AT - 0.25) {
            window.setTimeout(() => {
              if (!this.wanted) return
              try {
                el.currentTime = START_AT
                this.sought = true
                if (el.paused) void el.play().catch(() => undefined)
              } catch {
                /* ignore */
              }
            }, 40)
          }
        })
        .catch(() => {
          /* gesture consumed; next tap / keepPlaying can retry */
        })
    }
  }

  mute() {
    this.wanted = false
    this.fadeFile(0, FADE_OUT, () => {
      if (this.wanted) return
      this.file.pause()
    })
  }

  keepPlaying() {
    if (!this.wanted) return
    if (this.file.ended) {
      this.seekStart(true)
    }
    if (this.file.paused || this.file.ended) {
      void this.file.play().catch(() => undefined)
    }
    if (!this.fading && this.file.volume < FILE_VOL * 0.5) {
      this.file.volume = FILE_VOL
    }
  }

  private fadeFile(to: number, seconds: number, done?: () => void) {
    cancelAnimationFrame(this.fileFade)
    this.fading = true
    const el = this.file
    const from = el.volume
    const start = performance.now()
    const dur = Math.max(40, seconds * 1000)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = t * t * (3 - 2 * t)
      el.volume = Math.min(1, Math.max(0, from + (to - from) * eased))
      if (t < 1) this.fileFade = requestAnimationFrame(step)
      else {
        this.fading = false
        done?.()
      }
    }
    this.fileFade = requestAnimationFrame(step)
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const fileRef = useRef<HTMLAudioElement | null>(null)
  const bed = useRef<Bed | null>(null)
  const onRef = useRef(true)
  const [on, setOn] = useState(true)
  const [live, setLive] = useState(false)

  const ensure = useCallback(() => {
    const el = fileRef.current
    if (!el) return null
    if (!bed.current) bed.current = new Bed(el)
    return bed.current
  }, [])

  const start = useCallback(() => {
    onRef.current = true
    setOn(true)
    const engine = ensure()
    if (!engine) return
    // Must stay fully synchronous with the user gesture.
    engine.play()
    setLive(!engine.file.paused)
  }, [ensure])

  const toggle = useCallback(() => {
    if (onRef.current) {
      onRef.current = false
      setOn(false)
      ensure()?.mute()
      setLive(false)
      return
    }
    start()
  }, [ensure, start])

  useEffect(() => {
    const engine = ensure()
    if (!engine) return

    if (onRef.current) engine.tryAutoplay()

    const kick = (event: Event) => {
      if (!onRef.current || engine.live()) return
      if (event.target instanceof Element && event.target.closest('[data-sound-toggle]')) return
      // Intro calls start() itself — avoid double-handling that gesture.
      if (event.target instanceof Element && event.target.closest('.intro')) return
      engine.play()
      setLive(true)
    }

    const syncLive = () => setLive(engine.live())

    const resume = () => {
      if (!onRef.current) return
      engine.keepPlaying()
      setLive(engine.live())
    }

    const onEnded = () => {
      if (!onRef.current) return
      engine.seekStart(true)
      void engine.file.play().catch(() => undefined)
    }

    window.addEventListener('pointerdown', kick, true)
    window.addEventListener('keydown', kick, true)
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    engine.file.addEventListener('playing', syncLive)
    engine.file.addEventListener('pause', resume)
    engine.file.addEventListener('ended', onEnded)
    engine.file.addEventListener('stalled', resume)
    engine.file.addEventListener('error', resume)
    const watchdog = window.setInterval(resume, 2000)

    return () => {
      window.removeEventListener('pointerdown', kick, true)
      window.removeEventListener('keydown', kick, true)
      window.removeEventListener('pageshow', resume)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
      engine.file.removeEventListener('playing', syncLive)
      engine.file.removeEventListener('pause', resume)
      engine.file.removeEventListener('ended', onEnded)
      engine.file.removeEventListener('stalled', resume)
      engine.file.removeEventListener('error', resume)
      window.clearInterval(watchdog)
    }
  }, [ensure])

  const value = useMemo(() => ({ on, live, toggle, start }), [on, live, toggle, start])

  return (
    <SoundContext.Provider value={value}>
      <audio
        ref={fileRef}
        className="sound-bed"
        src={TRACK}
        preload="auto"
      />
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used inside SoundProvider')
  return ctx
}
