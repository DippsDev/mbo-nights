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

const TRACK = '/audio/bed.wav'
const FILE_VOL = 0.38
const AMBIENT_VOL = 0.2
const FADE_IN = 7
const FADE_OUT = 1.2
const FADE_RESUME = 2.4

function createAudioContext() {
  const C =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return C ? new C() : null
}

class Bed {
  file: HTMLAudioElement
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private nodes = false
  private fadeFrame = 0
  private fileFade = 0
  mode: 'file' | 'ambient' | null = null

  constructor(file: HTMLAudioElement) {
    this.file = file
    this.file.loop = true
    this.file.preload = 'auto'
    this.file.setAttribute('playsinline', '')
    this.file.volume = 0
  }

  live() {
    if (this.mode === 'file') return !this.file.paused
    if (this.mode === 'ambient') return this.ctx?.state === 'running'
    return false
  }

  tryAutoplay() {
    void this.file
      .play()
      .then(() => {
        if (this.mode === 'ambient') {
          this.file.pause()
          return
        }
        this.mode = 'file'
        this.fadeFile(FILE_VOL, FADE_IN)
      })
      .catch(() => undefined)
  }

  /** Call only from a click / tap / key handler. Starts immediately, no await. */
  play(seconds = FADE_IN) {
    if (this.mode === 'file') {
      void this.file.play().catch(() => this.unlock(seconds))
      this.fadeFile(FILE_VOL, seconds)
      return
    }
    this.unlock(seconds)
  }

  unlock(seconds = FADE_IN) {
    if (this.mode === 'file') {
      void this.file.play().catch(() => undefined)
      this.fadeFile(FILE_VOL, seconds)
      return
    }

    const ctx = this.ctx ?? createAudioContext()
    if (!ctx) return
    this.ctx = ctx
    void ctx.resume()
    if (!this.master) {
      this.master = ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(ctx.destination)
    }
    if (!this.nodes) this.connectDrone(ctx, this.master)
    this.mode = 'ambient'
    this.file.pause()
    this.fadeAmbient(AMBIENT_VOL, seconds)
  }

  mute() {
    this.fadeFile(0, FADE_OUT, () => {
      this.file.pause()
      this.file.currentTime = 0
    })
    this.fadeAmbient(0, FADE_OUT, () => {
      void this.ctx?.suspend()
    })
  }

  duck() {
    if (this.mode === 'file') this.fadeFile(0, 0.28)
    else this.fadeAmbient(0, 0.28)
  }

  private connectDrone(ctx: AudioContext, master: GainNode) {
    this.nodes = true
    ;[
      [220, 0.45],
      [277.18, 0.28],
      [329.63, 0.22],
      [440, 0.12],
    ].forEach(([hz, gain]) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      g.gain.value = gain
      osc.connect(g)
      g.connect(master)
      osc.start()
    })
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

  private fadeAmbient(to: number, seconds: number, done?: () => void) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) {
      done?.()
      return
    }
    cancelAnimationFrame(this.fadeFrame)
    const from = master.gain.value
    const t0 = ctx.currentTime
    master.gain.cancelScheduledValues(t0)
    master.gain.setValueAtTime(from, t0)
    master.gain.linearRampToValueAtTime(to, t0 + seconds)
    if (!done) return
    const start = performance.now()
    const dur = Math.max(40, seconds * 1000)
    const wait = (now: number) => {
      if (now - start < dur) this.fadeFrame = requestAnimationFrame(wait)
      else done()
    }
    this.fadeFrame = requestAnimationFrame(wait)
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
      if (!onRef.current) return
      if (event.target instanceof Element && event.target.closest('[data-sound-toggle]')) return
      engine.play(engine.live() ? FADE_RESUME : FADE_IN)
      setLive(engine.live())
    }

    const onVisible = () => {
      if (!onRef.current) return
      if (document.hidden) {
        engine.duck()
        return
      }
      if (engine.mode) engine.play(FADE_RESUME)
      else engine.tryAutoplay()
      setLive(engine.live())
    }

    const syncLive = () => setLive(engine.live())
    const id = window.setInterval(syncLive, 400)

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
      window.clearInterval(id)
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
