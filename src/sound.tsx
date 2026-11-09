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
/**
 * The bed already starts where the music should (the intro was cut out of the
 * file), so we never seek. Seeking was what broke iPad: Safari would sometimes
 * land the jump before the data was ready and report the track as `ended`.
 */
const TRACK = '/audio/DippsDevBed.mp3'
const FILE_VOL = 0.55
/** Long, soft rise so the bed arrives instead of slamming in. (iOS ignores volume.) */
const FADE_IN = 7.5

/**
 * On-screen sound log for debugging on devices without a console (iPad).
 * Turn on by opening the site with ?sounddebug — stays on for that tab.
 */
const soundDebug = (() => {
  if (typeof window === 'undefined') return false
  try {
    if (new URLSearchParams(location.search).has('sounddebug')) {
      sessionStorage.setItem('sounddebug', '1')
    }
    return sessionStorage.getItem('sounddebug') === '1'
  } catch {
    return false
  }
})()

function logSound(msg: string) {
  if (!soundDebug) return
  let box = document.getElementById('sound-debug')
  if (!box) {
    box = document.createElement('pre')
    box.id = 'sound-debug'
    box.style.cssText =
      'position:fixed;left:6px;bottom:6px;z-index:99999;max-width:min(94vw,460px);max-height:40vh;overflow:auto;margin:0;padding:6px 8px;background:rgba(0,0,0,.85);color:#d6ff4b;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none'
    document.body.appendChild(box)
  }
  const time = new Date().toLocaleTimeString('en-GB')
  const lines = [`${time} ${msg}`, ...(box.textContent ?? '').split('\n')]
  box.textContent = lines.slice(0, 40).join('\n')
}

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
  private introFadeDone = false
  private unlocked = false
  /** Set from the element's own `playing` event — iOS play() promises can lie. */
  private everPlayed = false
  private retried = false

  constructor(file: HTMLAudioElement) {
    this.file = file
    // Native looping: no `ended` → seek → play dance for us to get wrong.
    this.file.loop = true
    // Metadata only until unlock — leave bandwidth for the hero video.
    this.file.preload = needsGestureUnlock() ? 'metadata' : 'auto'
    this.file.muted = false
    this.file.setAttribute('playsinline', '')
    this.file.setAttribute('webkit-playsinline', '')
    if (!this.file.getAttribute('src')?.endsWith(TRACK)) this.file.src = TRACK

    this.file.addEventListener('playing', () => {
      this.everPlayed = true
      this.unlocked = true
    })

    if (soundDebug) {
      const types = ['play', 'playing', 'pause', 'ended', 'emptied', 'stalled', 'waiting']
      for (const type of types) {
        this.file.addEventListener(type, () =>
          logSound(
            `${type} t=${this.file.currentTime.toFixed(1)} dur=${this.file.duration.toFixed(1)}`,
          ),
        )
      }
    }
  }

  live() {
    return !this.file.paused && !this.file.ended
  }

  private play(onStarted?: () => void) {
    void this.file
      .play()
      .then(() => {
        this.unlocked = true
        this.everPlayed = true
        onStarted?.()
      })
      .catch((err: unknown) => {
        logSound(`play() rejected: ${(err as { name?: string })?.name ?? String(err)}`)
        // iOS can reject while actually playing — the `playing` event already
        // covered that. Only a bed that has never made a sound gets one reload.
        if (this.everPlayed || !this.file.paused || this.retried) return
        this.retried = true
        try {
          this.file.load()
        } catch {
          /* ignore */
        }
        void this.file
          .play()
          .then(() => onStarted?.())
          .catch(() => undefined)
      })
  }

  /** Desktop open-page path. No-ops on gesture-locked mobile until unlocked. */
  beginFadeIn() {
    this.wanted = true
    if (needsGestureUnlock() && !this.unlocked) return
    if (this.live()) return
    this.file.muted = false
    if (!this.everPlayed) this.file.volume = 0
    this.play(() => this.startIntroFade(FADE_IN))
  }

  /** Enter tap / later taps — start the bed, or resume it where it stopped. */
  playFromGesture() {
    logSound(`gesture paused=${this.file.paused} everPlayed=${this.everPlayed}`)
    this.wanted = true
    const el = this.file
    el.preload = 'auto'
    el.muted = false

    if (this.live()) {
      this.unlocked = true
      if (!this.introFadeDone) this.startIntroFade(FADE_IN)
      return
    }

    if (!this.everPlayed) {
      this.introFadeDone = false
      cancelAnimationFrame(this.fileFade)
      this.fading = false
      el.volume = 0
    }
    this.play(() => this.startIntroFade(FADE_IN))
  }

  mute() {
    this.wanted = false
    this.introFadeDone = false
    cancelAnimationFrame(this.fileFade)
    this.fading = false
    const el = this.file
    // Cut immediately — fade-out feels broken on mobile Mute taps.
    el.volume = 0
    el.muted = true
    el.pause()
  }

  /** iOS paused us (another media element, a call, etc). Pick up where it stopped. */
  keepPlaying() {
    if (!this.wanted || !this.unlocked || this.live()) return
    logSound('resume after pause')
    void this.file.play().catch(() => undefined)
  }

  private startIntroFade(seconds: number) {
    if (!this.wanted) return
    const el = this.file
    if (this.introFadeDone || el.volume >= FILE_VOL * 0.98) {
      this.introFadeDone = true
      el.volume = FILE_VOL
      return
    }
    if (this.fading) return
    this.fadeFile(FILE_VOL, seconds, () => {
      this.introFadeDone = true
    })
  }

  private fadeFile(to: number, seconds: number, done?: () => void) {
    cancelAnimationFrame(this.fileFade)
    this.fading = true
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
  el.loop = true
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
    ensure().playFromGesture()
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

    // A tap while the bed is stopped (but not muted) starts/resumes it.
    const kick = (event: Event) => {
      if (soundDebug) logSound(`tap live=${engine.live()} on=${onRef.current}`)
      if (!onRef.current || engine.live()) return
      if (event.target instanceof Element && event.target.closest('[data-sound-toggle]')) return
      // Intro owns the first unlock + fade on mobile.
      if (event.target instanceof Element && event.target.closest('.intro')) return
      engine.playFromGesture()
    }

    const syncLive = () => setLive(engine.live())

    let resumeTimer = 0
    const onPause = () => {
      syncLive()
      if (!onRef.current || !engine.wanted) return
      // Backgrounded tab / locked screen: let it stay paused; `resume` handles return.
      if (document.visibilityState !== 'visible') return
      window.clearTimeout(resumeTimer)
      resumeTimer = window.setTimeout(() => engine.keepPlaying(), 250)
    }

    const resume = () => {
      if (!onRef.current || document.visibilityState !== 'visible') return
      if (gestureLocked) engine.keepPlaying()
      else if (!engine.live()) engine.beginFadeIn()
      setLive(engine.live())
    }

    window.addEventListener('pointerdown', kick, true)
    window.addEventListener('keydown', kick, true)
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    engine.file.addEventListener('playing', syncLive)
    engine.file.addEventListener('pause', onPause)

    return () => {
      window.clearInterval(boot)
      window.removeEventListener('pointerdown', kick, true)
      window.removeEventListener('keydown', kick, true)
      window.removeEventListener('pageshow', resume)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
      engine.file.removeEventListener('playing', syncLive)
      engine.file.removeEventListener('pause', onPause)
      window.clearTimeout(resumeTimer)
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
