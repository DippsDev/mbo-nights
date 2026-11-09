import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import jsQR from 'jsqr'
import AdminGate from '../components/AdminGate'
import { nights } from '../data'
import {
  checkIn,
  doorCounts,
  STATUS_LABEL,
  TicketError,
  undoCheckIn,
  type CheckInResult,
  type DoorCounts,
} from '../lib/tickets'

const NIGHT_KEY = 'mbo.door.night'
/** Ignore the same QR for this long so one held-up phone isn't scanned twice. */
const SAME_CODE_MS = 5000
const SCAN_EVERY_MS = 180

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorCtor = {
  new (opts: { formats: string[] }): Detector
  getSupportedFormats?: () => Promise<string[]>
}

async function makeNativeDetector(): Promise<Detector | null> {
  const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
  if (!Ctor) return null
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ['qr_code']
    return formats.includes('qr_code') ? new Ctor({ formats: ['qr_code'] }) : null
  } catch {
    return null
  }
}

const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''

function buzz(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [120, 80, 120])
  } catch {
    /* not supported */
  }
}

export default function AdminScanPage() {
  return (
    <AdminGate>
      <Scanner />
    </AdminGate>
  )
}

function Scanner() {
  const [nightId, setNightId] = useState(() => {
    try {
      const saved = localStorage.getItem(NIGHT_KEY)
      if (saved && nights.some((n) => n.id === saved)) return saved
    } catch {
      /* storage blocked */
    }
    return nights[0]?.id ?? ''
  })
  const [counts, setCounts] = useState<DoorCounts | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState('')
  const [camera, setCamera] = useState<'off' | 'starting' | 'on'>('off')
  const [camError, setCamError] = useState('')
  const [manual, setManual] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const clearRef = useRef<number | undefined>(undefined)
  const busyRef = useRef(false)
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const nightRef = useRef(nightId)
  useEffect(() => {
    nightRef.current = nightId
  }, [nightId])

  const night = nights.find((n) => n.id === nightId)

  const loadCounts = useCallback(() => {
    doorCounts(nightId)
      .then(setCounts)
      .catch(() => undefined)
  }, [nightId])

  useEffect(() => {
    try {
      localStorage.setItem(NIGHT_KEY, nightId)
    } catch {
      /* storage blocked */
    }
    loadCounts()
    // Other door phones are scanning too — keep the count fresh.
    const id = window.setInterval(loadCounts, 15_000)
    return () => window.clearInterval(id)
  }, [nightId, loadCounts])

  const submit = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase()
    if (!code || busyRef.current) return
    const now = Date.now()
    if (code === lastRef.current.code && now - lastRef.current.at < SAME_CODE_MS) return
    lastRef.current = { code, at: now }
    busyRef.current = true
    setError('')
    try {
      const r = await checkIn(code, nightRef.current)
      setResult(r)
      setCounts(r.counts)
      buzz(r.result === 'ok')
      window.clearTimeout(clearRef.current)
      // Green clears itself fast so the line keeps moving; problems stay up longer.
      clearRef.current = window.setTimeout(() => setResult(null), r.result === 'ok' ? 3500 : 8000)
    } catch (err) {
      setError(err instanceof TicketError ? err.message : 'Couldn’t check that ticket.')
      buzz(false)
    } finally {
      busyRef.current = false
    }
  }, [])

  const stopCamera = useCallback(() => {
    window.clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamera('off')
  }, [])

  const startCamera = async () => {
    setCamError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('This browser can’t use the camera here. Open the site over https (the live site) or type codes below.')
      return
    }
    setCamera('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setCamera('on')

      const native = await makeNativeDetector()
      const tick = async () => {
        if (!streamRef.current) return
        if (!busyRef.current && video.readyState >= 2) {
          try {
            let value: string | undefined
            if (native) {
              value = (await native.detect(video))[0]?.rawValue
            } else {
              const scale = Math.min(1, 640 / video.videoWidth)
              const w = Math.round(video.videoWidth * scale)
              const h = Math.round(video.videoHeight * scale)
              const canvas = (canvasRef.current ??= document.createElement('canvas'))
              canvas.width = w
              canvas.height = h
              const ctx = canvas.getContext('2d', { willReadFrequently: true })
              if (ctx && w && h) {
                ctx.drawImage(video, 0, 0, w, h)
                const img = ctx.getImageData(0, 0, w, h)
                value = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data
              }
            }
            if (value) await submit(value)
          } catch {
            /* a bad frame — keep going */
          }
        }
        timerRef.current = window.setTimeout(() => void tick(), SCAN_EVERY_MS)
      }
      void tick()
    } catch (err) {
      stopCamera()
      const name = (err as { name?: string }).name
      setCamError(
        name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow it in the browser’s site settings, then try again.'
          : 'Couldn’t start the camera. You can still type codes below.',
      )
    }
  }

  useEffect(() => stopCamera, [stopCamera])

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    lastRef.current = { code: '', at: 0 } // typing the same code again is deliberate
    void submit(manual).then(() => setManual(''))
  }

  const undo = async (code: string) => {
    try {
      setCounts(await undoCheckIn(code, nightId))
      setResult(null)
      lastRef.current = { code: '', at: 0 }
    } catch (err) {
      setError(err instanceof TicketError ? err.message : 'Couldn’t undo.')
    }
  }

  return (
    <main className="page flow">
      <header className="page-hero door-head">
        <p className="kicker">Door</p>
        <label className="field">
          <span>Night</span>
          <select value={nightId} onChange={(e) => {
              setResult(null)
              setNightId(e.target.value)
            }}>
            {nights.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title} · {n.date}
              </option>
            ))}
          </select>
        </label>
        <div className="door-count" aria-live="polite">
          <strong>{counts ? counts.checkedIn : '–'}</strong>
          <span>/ {counts ? counts.total : '–'} in</span>
        </div>
      </header>

      <section className="section door" style={{ paddingTop: 0 }}>
        <div className={`door-camera${camera === 'off' ? ' is-off' : ''}`}>
          <video ref={videoRef} muted playsInline aria-label="Camera preview" />
          {camera !== 'off' && <div className="door-frame" aria-hidden />}
          {camera === 'off' && (
            <button className="btn" onClick={() => void startCamera()}>
              Start scanning
            </button>
          )}
        </div>
        {camera === 'on' && (
          <button className="link-arrow door-stop" onClick={stopCamera}>
            Stop camera
          </button>
        )}
        {camError && <p className="form-error">{camError}</p>}

        {result && (
          <DoorResult result={result} nightTitle={night?.title ?? ''} onUndo={undo} onClose={() => setResult(null)} />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <form className="form door-manual" onSubmit={submitManual}>
          <label className="field">
            <span>Type a code</span>
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="MBO-T-XXXXXXXXXX"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="btn ghost" type="submit" disabled={!manual.trim()}>
            Check
          </button>
        </form>

        <Link className="link-arrow" to="/admin/orders">
          ← Orders
        </Link>
      </section>
    </main>
  )
}

function DoorResult({
  result,
  nightTitle,
  onUndo,
  onClose,
}: {
  result: CheckInResult
  nightTitle: string
  onUndo: (code: string) => void
  onClose: () => void
}) {
  if (result.result === 'not_found') {
    return (
      <div className="door-result bad" role="alert" onClick={onClose}>
        <strong>Not a ticket</strong>
        <span>{result.code} isn’t in the system.</span>
      </div>
    )
  }
  const t = result.ticket
  const who = (
    <span>
      {t.tierName} · {t.holder} · {t.ref}
    </span>
  )

  switch (result.result) {
    case 'ok':
      return (
        <div className="door-result ok" role="status">
          <strong>Let in</strong>
          {who}
          <button className="link-arrow" onClick={() => onUndo(t.code)}>
            Undo
          </button>
        </div>
      )
    case 'already':
      return (
        <div className="door-result bad" role="alert" onClick={onClose}>
          <strong>Already used</strong>
          <span>Scanned at {clock(t.checkedInAt)}</span>
          {who}
        </div>
      )
    case 'wrong_event':
      return (
        <div className="door-result warn" role="alert" onClick={onClose}>
          <strong>Wrong night</strong>
          <span>
            This ticket is for {t.title}, not {nightTitle}.
          </span>
          {who}
        </div>
      )
    case 'not_valid':
      return (
        <div className="door-result bad" role="alert" onClick={onClose}>
          <strong>Not valid</strong>
          <span>Order is {STATUS_LABEL[t.orderStatus].toLowerCase()}.</span>
          {who}
        </div>
      )
  }
}
