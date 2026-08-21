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
const FILE_VOL = 0.38
const FADE_IN = 7
const FADE_OUT = 1.2
const FADE_RESUME = 2.4

class Bed {
  file: HTMLAudioElement
  private fileFade = 0

  constructor(file: HTMLAudioElement) {
    this.file = file
    this.file.loop = true
    this.file.preload = 'auto'
    this.file.setAttribute('playsinline', '')
    this.file.volume = 0
  }

  live() {
    return !this.file.paused
  }

  tryAutoplay() {
    void this.file
      .play()
      .then(() => this.fadeFile(FILE_VOL, FADE_IN))
      .catch(() => undefined)
  }

  /** Call only from a click / tap / key handler. Starts immediately, no await. */
  play(seconds = FADE_IN) {
    void this.file.play().catch(() => undefined)
    this.fadeFile(FILE_VOL, seconds)
  }

  mute() {
    this.fadeFile(0, FADE_OUT, () => {
      this.file.pause()
      this.file.currentTime = 0
    })
  }

  duck() {
    this.fadeFile(0, 0.28)
  }

  private fadeFile(to: number, seconds: number, done?: () => void) {
    cancelAnimationFrame(this.fileFade)
    const el = this.file
    const from = el.volume
    const start = performance.now()
    const dur = Math.max(40, seconds * 1000)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = t * t * (3 - 2 * t)
      el.volume = Math.min(1, Math.max(0, from + (to - from) * eased))
      if (t < 1) this.fileFade = requestAnimationFrame(step)
      else done?.()
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
    ensure()?.play(FADE_IN)
  }, [ensure])

  const toggle = useCallback(() => {
    const engine = ensure()
    if (onRef.current && engine?.live()) {
      onRef.current = false
      setOn(false)
      engine.mute()
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
      engine.play(FADE_IN)
      setLive(true)
    }

    const onVisible = () => {
      if (!onRef.current) return
      if (document.hidden) {
        engine.duck()
        return
      }
      engine.play(FADE_RESUME)
      setLive(engine.live())
    }

    const syncLive = () => setLive(engine.live())

    const onPageShow = () => {
      if (onRef.current) engine.tryAutoplay()
    }

    window.addEventListener('pointerdown', kick, true)
    window.addEventListener('keydown', kick, true)
    window.addEventListener('touchstart', kick, { capture: true, passive: true })
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisible)
    engine.file.addEventListener('playing', syncLive)
    engine.file.addEventListener('pause', syncLive)

    return () => {
      window.removeEventListener('pointerdown', kick, true)
      window.removeEventListener('keydown', kick, true)
      window.removeEventListener('touchstart', kick, true)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisible)
      engine.file.removeEventListener('playing', syncLive)
      engine.file.removeEventListener('pause', syncLive)
    }
  }, [ensure])

  const value = useMemo(() => ({ on, live, toggle, start }), [on, live, toggle, start])

  return (
    <SoundContext.Provider value={value}>
      <audio ref={fileRef} className="sound-bed" src={TRACK} loop playsInline preload="auto" />
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used inside SoundProvider')
  return ctx
}
