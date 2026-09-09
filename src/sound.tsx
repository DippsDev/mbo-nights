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

export const SOUND_BED_ID = 'mbo-sound-bed'
const TRACK = '/audio/DippsDev.mp3'
const START_AT = 8
const FILE_VOL = 0.55
/** Long, soft rise so the bed arrives instead of slamming in. */
const FADE_IN = 7.5
const FADE_OUT = 1.1

/** Phones / iOS block unmuted autoplay and failed play() calls can poison later unlocks. */
function needsGestureUnlock() {
  if (typeof window === 'undefined') return true
  const ua = navigator.userAgent
  const iOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const coarse = window.matchMedia('(pointer: coarse), (hover: none)').matches
  return iOS || coarse
}

class Bed {
  file: HTMLAudioElement
  wanted = true
  private fileFade = 0
  private fading = false
  private fadeTarget = -1
  private sought = false
  private introFadeDone = false
  private unlocked = false

  constructor(file: HTMLAudioElement) {
    this.file = file
    this.file.loop = false
    // Metadata only until unlock — leave bandwidth for the hero video.
    this.file.preload = needsGestureUnlock() ? 'metadata' : 'auto'
    this.file.muted = false
    this.file.setAttribute('playsinline', '')
    this.file.setAttribute('webkit-playsinline', '')
    if (!this.file.getAttribute('src')) this.file.src = TRACK
    // Preload + park at the bed start while paused (safe without a gesture).
    this.seekWhilePaused()
  }

  live() {
    return !this.file.paused && !this.file.ended
  }

  seekWhilePaused(force = false) {
    if (this.sought && !force) return
    if (force) this.sought = false
    const el = this.file
    if (!el.paused && el.currentTime > 0.2) return
    const apply = () => {
      if (!el.paused && el.currentTime > 0.2) return
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

  seekStart(force = false) {
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

  /** Desktop open-page path. No-ops on gesture-locked mobile until unlocked. */
  beginFadeIn() {
    this.wanted = true
    if (needsGestureUnlock() && !this.unlocked) {
      this.seekWhilePaused()
      return
    }
    const el = this.file
    el.muted = false
    this.seekWhilePaused()

    const ensurePlay = () => {
      if (!this.wanted) return
      void el
        .play()
        .then(() => {
          this.unlocked = true
          this.startIntroFade(FADE_IN)
        })
        .catch(() => undefined)
    }

    ensurePlay()
    if (el.readyState < 2) {
      el.addEventListener('canplay', ensurePlay, { once: true })
    }
  }

  /** Splash / first tap — always fade 0 → full. */
  playFromGesture() {
    this.wanted = true
    this.unlocked = true
    this.introFadeDone = false
    const el = this.file
    el.preload = 'auto'
    el.muted = false
    cancelAnimationFrame(this.fileFade)
    this.fading = false
    this.fadeTarget = -1
    el.volume = 0

    const runFade = () => this.startIntroFade(FADE_IN)

    const attempt = () => {
      void el
        .play()
        .then(() => {
          runFade()
        })
        .catch(() => {
          // Recover from earlier failed autoplay attempts on iOS.
          try {
            el.load()
          } catch {
            /* ignore */
          }
          el.volume = 0
          this.sought = false
          this.seekWhilePaused(true)
          void el
            .play()
            .then(() => {
              runFade()
            })
            .catch(() => undefined)
        })
    }

    attempt()
  }

  mute() {
    this.wanted = false
    this.introFadeDone = false
    this.fadeFile(0, FADE_OUT, () => {
      if (this.wanted) return
      this.file.pause()
    })
  }

  keepPlaying() {
    if (!this.wanted || !this.unlocked) return
    if (this.file.ended) this.seekStart(true)
    if (this.file.paused || this.file.ended) {
      void this.file.play().catch(() => undefined)
    }
  }

  private startIntroFade(seconds: number) {
    if (!this.wanted) return
    const el = this.file
    if (this.introFadeDone || el.volume >= FILE_VOL * 0.98) {
      this.introFadeDone = true
      el.volume = FILE_VOL
      return
    }
    if (this.fading && this.fadeTarget === FILE_VOL) return
    this.fadeFile(FILE_VOL, seconds, () => {
      this.introFadeDone = true
    })
  }

  private fadeFile(to: number, seconds: number, done?: () => void) {
    cancelAnimationFrame(this.fileFade)
    this.fading = true
    this.fadeTarget = to
    const el = this.file
    const from = el.volume
    const span = Math.max(0.04, Math.abs(to - from) / Math.max(0.04, FILE_VOL))
    const start = performance.now()
    const dur = Math.max(80, seconds * 1000 * span)
    const step = (now: number) => {
      if (!this.fading) return
      const t = Math.min(1, (now - start) / dur)
      const eased = t * t * t * (t * (t * 6 - 15) + 10)
      el.volume = Math.min(1, Math.max(0, from + (to - from) * eased))
      if (t < 1) this.fileFade = requestAnimationFrame(step)
      else {
        this.fading = false
        this.fadeTarget = -1
        el.volume = to
        done?.()
      }
    }
    this.fileFade = requestAnimationFrame(step)
  }
}

function resolveBedElement() {
  const existing = document.getElementById(SOUND_BED_ID)
  if (existing instanceof HTMLAudioElement) return existing
  const el = document.createElement('audio')
  el.id = SOUND_BED_ID
  el.className = 'sound-bed'
  el.preload = 'metadata'
  el.src = TRACK
  el.setAttribute('playsinline', '')
  el.setAttribute('webkit-playsinline', '')
  document.body.appendChild(el)
  return el
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const bed = useRef<Bed | null>(null)
  const onRef = useRef(true)
  const [on, setOn] = useState(true)
  const [live, setLive] = useState(false)

  const ensure = useCallback(() => {
    if (!bed.current) bed.current = new Bed(resolveBedElement())
    return bed.current
  }, [])

  const start = useCallback(() => {
    onRef.current = true
    setOn(true)
    const engine = ensure()
    engine.playFromGesture()
    // live flips on the playing event; don't assume sync success
  }, [ensure])

  const toggle = useCallback(() => {
    if (onRef.current) {
      onRef.current = false
      setOn(false)
      ensure().mute()
      setLive(false)
      return
    }
    start()
  }, [ensure, start])

  useEffect(() => {
    const engine = ensure()
    const gestureLocked = needsGestureUnlock()

    // Desktop: fade in on open. Mobile: wait for Enter (gesture).
    if (onRef.current && !gestureLocked) engine.beginFadeIn()

    let tries = 0
    const boot = window.setInterval(() => {
      if (gestureLocked || !onRef.current || engine.live() || tries > 12) {
        window.clearInterval(boot)
        return
      }
      tries += 1
      engine.beginFadeIn()
    }, 500)

    const kick = (event: Event) => {
      if (!onRef.current || engine.live()) return
      if (event.target instanceof Element && event.target.closest('[data-sound-toggle]')) return
      // Intro owns the first unlock + fade on mobile.
      if (event.target instanceof Element && event.target.closest('.intro')) return
      engine.playFromGesture()
    }

    const syncLive = () => setLive(engine.live())

    const resume = () => {
      if (!onRef.current) return
      if (gestureLocked && !engine.live()) return
      if (!engine.live()) engine.beginFadeIn()
      else engine.keepPlaying()
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
    engine.file.addEventListener('pause', syncLive)
    engine.file.addEventListener('ended', onEnded)

    return () => {
      window.clearInterval(boot)
      window.removeEventListener('pointerdown', kick, true)
      window.removeEventListener('keydown', kick, true)
      window.removeEventListener('pageshow', resume)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
      engine.file.removeEventListener('playing', syncLive)
      engine.file.removeEventListener('pause', syncLive)
      engine.file.removeEventListener('ended', onEnded)
    }
  }, [ensure])

  const value = useMemo(() => ({ on, live, toggle, start }), [on, live, toggle, start])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used inside SoundProvider')
  return ctx
}
