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
const PLAYLIST = [
  '/audio/DippsDevBed.mp3',
  '/audio/DippsDevBed3.mp3',
  '/audio/DippsDevBed4.mp3',
]
const FILE_VOL = 0.55
/** Long, soft rise so the bed arrives instead of slamming in. (iOS ignores volume.) */
const FADE_IN = 7.5
/** Each track eases out over its last few seconds… */
const TRACK_FADE_OUT = 4
/** …and the next one eases in. */
const TRACK_FADE_IN = 3

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
  private index = 0
  private fadingOut = false
  private prefetched = -1
  private fadeTimer = 0
  /** Phones/tablets: volume runs through a Web Audio gain, because iOS ignores el.volume. */
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null

  constructor(file: HTMLAudioElement) {
    this.file = file
    // One element for the whole playlist: once iOS unlocks it, swapping src
    // and calling play() from `ended` keeps working without a new gesture.
    this.file.loop = false
    // Metadata only until unlock — leave bandwidth for the hero video.
    this.file.preload = needsGestureUnlock() ? 'metadata' : 'auto'
    this.file.muted = false
    this.file.setAttribute('playsinline', '')
    this.file.setAttribute('webkit-playsinline', '')
    const current = this.file.getAttribute('src') ?? ''
    const found = PLAYLIST.findIndex((t) => current.endsWith(t))
    if (found >= 0) this.index = found
    else this.file.src = PLAYLIST[0]

    this.file.addEventListener('playing', () => {
      this.everPlayed = true
      this.unlocked = true
    })
    this.file.addEventListener('timeupdate', () => this.maybeFadeOut())
    this.file.addEventListener('ended', () => this.next())

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
    if (!this.everPlayed) this.setVol(0)
    this.play(() => this.startIntroFade(FADE_IN))
  }

  /** Enter tap / later taps — start the bed, or resume it where it stopped. */
  playFromGesture() {
    logSound(`gesture paused=${this.file.paused} everPlayed=${this.everPlayed}`)
    this.wanted = true
    const el = this.file
    el.preload = 'auto'
    el.muted = false
    this.wakeGraph()

    if (this.live()) {
      this.unlocked = true
      if (!this.introFadeDone) this.startIntroFade(FADE_IN)
      return
    }

    if (!this.everPlayed) {
      this.introFadeDone = false
      this.stopFade()
      this.setVol(0)
    }
    this.play(() => this.startIntroFade(FADE_IN))
  }

  mute() {
    this.wanted = false
    this.introFadeDone = false
    this.stopFade()
    this.fadingOut = false
    const el = this.file
    // Cut immediately — fade-out feels broken on mobile Mute taps.
    this.setVol(0)
    el.muted = true
    el.pause()
  }

  /** iOS paused us (another media element, a call, etc). Pick up where it stopped. */
  keepPlaying() {
    if (!this.wanted || !this.unlocked || this.live()) return
    logSound('resume after pause')
    void this.ctx?.resume().catch(() => undefined)
    void this.file.play().catch(() => undefined)
  }

  /** Ease the current track out as it nears its end. */
  private maybeFadeOut() {
    const el = this.file
    if (!this.wanted || this.fadingOut || el.paused) return
    const left = el.duration - el.currentTime
    if (!Number.isFinite(left) || el.duration < TRACK_FADE_OUT * 3) return
    // Warm the cache for the next file so it starts without a load gap.
    if (left < 30 && this.prefetched !== this.index && !this.gain) {
      this.prefetched = this.index
      const warm = new Audio()
      warm.preload = 'auto'
      warm.src = PLAYLIST[(this.index + 1) % PLAYLIST.length]
    }
    if (left > TRACK_FADE_OUT) return
    this.fadingOut = true
    this.introFadeDone = false
    // Finish the fade slightly early and cut straight to the next track,
    // rather than sitting through the silent tail until `ended`.
    this.fadeFile(0, Math.max(0.3, left - 0.4), () => this.next(true), true)
  }

  /** Track finished — move on, wrapping back to the first after the last. */
  private next(early = false) {
    const el = this.file
    // Safari can fire a bogus `ended` early; just carry on with the same track.
    // Only treat it as bogus when we're clearly mid-track: Safari misjudges MP3
    // lengths, so a real end can arrive well before `duration`.
    if (!early && Number.isFinite(el.duration) && el.currentTime < el.duration * 0.5) {
      if (this.wanted) void el.play().catch(() => undefined)
      return
    }
    this.index = (this.index + 1) % PLAYLIST.length
    logSound(`next track ${this.index}`)
    this.stopFade()
    this.fadingOut = false
    this.introFadeDone = false
    this.setVol(0)
    el.src = PLAYLIST[this.index]
    if (!this.wanted) return
    void el
      .play()
      .then(() => {
        if (!this.wanted) return
        // Ease-out curve: audible right away, then settles — no near-silent lead-in.
        this.fadeFile(FILE_VOL, TRACK_FADE_IN, () => (this.introFadeDone = true), true, true)
      })
      .catch(() => undefined)
  }

  private startIntroFade(seconds: number) {
    if (!this.wanted) return
    if (this.introFadeDone || this.getVol() >= FILE_VOL * 0.98) {
      this.introFadeDone = true
      this.setVol(FILE_VOL)
      return
    }
    if (this.fading) return
    this.fadeFile(FILE_VOL, seconds, () => {
      this.introFadeDone = true
    })
  }

  private fadeFile(
    to: number,
    seconds: number,
    done?: () => void,
    exact = false,
    easeOut = false,
  ) {
    this.stopFade()
    this.fading = true
    const from = this.getVol()
    const span = exact ? 1 : Math.max(0.04, Math.abs(to - from) / Math.max(0.04, FILE_VOL))
    const dur = Math.max(80, seconds * 1000 * span)
    const ease = (t: number) =>
      easeOut ? 1 - (1 - t) ** 3 : t * t * t * (t * (t * 6 - 15) + 10)
    const finish = () => {
      if (!this.fading) return
      this.fading = false
      this.setVol(to)
      done?.()
    }

    if (this.gain && this.ctx) {
      // Schedule the whole curve on the audio clock: smooth on iOS, and it keeps
      // running when the screen locks and animation frames stop.
      const curve = new Float32Array(64)
      for (let i = 0; i < curve.length; i++) {
        curve[i] = from + (to - from) * ease(i / (curve.length - 1))
      }
      const g = this.gain.gain
      const now = this.ctx.currentTime
      g.cancelScheduledValues(now)
      g.setValueAtTime(from, now)
      g.setValueCurveAtTime(curve, now, dur / 1000)
      this.fadeTimer = window.setTimeout(finish, dur + 30)
      return
    }

    const el = this.file
    const start = performance.now()
    const step = (now: number) => {
      if (!this.fading) return
      const t = Math.min(1, (now - start) / dur)
      el.volume = Math.min(1, Math.max(0, from + (to - from) * ease(t)))
      if (t < 1) this.fileFade = requestAnimationFrame(step)
      else finish()
    }
    this.fileFade = requestAnimationFrame(step)
  }

  private stopFade() {
    cancelAnimationFrame(this.fileFade)
    window.clearTimeout(this.fadeTimer)
    this.fading = false
    if (this.gain && this.ctx) {
      const g = this.gain.gain
      const v = g.value
      g.cancelScheduledValues(this.ctx.currentTime)
      g.setValueAtTime(v, this.ctx.currentTime)
    }
  }

  private getVol() {
    return this.gain ? this.gain.gain.value : this.file.volume
  }

  private setVol(v: number) {
    if (this.gain && this.ctx) {
      const g = this.gain.gain
      g.cancelScheduledValues(this.ctx.currentTime)
      g.setValueAtTime(v, this.ctx.currentTime)
    } else {
      this.file.volume = v
    }
  }

  /**
   * Must run inside a tap. On phones/tablets, route the bed through a gain node
   * (iOS ignores el.volume, so fades were hard cuts) and keep the context awake.
   */
  wakeGraph() {
    if (!needsGestureUnlock()) return
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      try {
        // iOS 16.4+: keep playing with the silent switch on, like a normal media element.
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
        if (session) session.type = 'playback'
        const ctx = new AC()
        const gain = ctx.createGain()
        const start = this.file.paused ? 0 : this.file.volume
        gain.gain.value = start
        ctx.createMediaElementSource(this.file).connect(gain)
        gain.connect(ctx.destination)
        this.file.volume = 1
        this.ctx = ctx
        this.gain = gain
        logSound('web audio graph on')
      } catch (err) {
        logSound(`web audio failed: ${String(err)}`)
        return
      }
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined)
  }
}

function resolveBedElement() {
  const existing = document.getElementById(SOUND_BED_ID)
  if (existing instanceof HTMLAudioElement) return existing
  const el = document.createElement('audio')
  el.id = SOUND_BED_ID
  el.className = 'sound-bed'
  el.preload = 'metadata'
  el.loop = false
  el.src = PLAYLIST[0]
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
      // iOS can suspend the audio context (calls, other apps); any tap wakes it.
      if (onRef.current) engine.wakeGraph()
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
