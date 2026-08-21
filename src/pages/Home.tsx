import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CAPABILITIES,
  PLACEHOLDER_KICKER,
  PLACEHOLDER_SHORT,
  artists,
  nextOpenNight,
} from '../data'
import HighlightReel from '../components/HighlightReel'
import { finePointer, isNarrow, reducedMotion } from '../lib/motion'
import { useSound } from '../sound'
import { gsap } from 'gsap'

export default function Home() {
  const next = nextOpenNight()
  const { on, toggle } = useSound()
  const hero = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = hero.current
    if (!el || !finePointer()) return

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [])

  useEffect(() => {
    if (reducedMotion() || isNarrow()) return

    const ctx = gsap.context(() => {
      gsap.to('.hero-copy', {
        yPercent: -8,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '.spotlight-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.utils.toArray<HTMLElement>('.capability').forEach((el) => {
        const img = el.querySelector('img')
        const copy = el.querySelector('div')
        if (img) {
          gsap.fromTo(
            img,
            { yPercent: -8, scale: 1.06 },
            {
              yPercent: 0,
              scale: 1,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          )
        }
        if (copy) {
          gsap.fromTo(
            copy,
            { y: 32, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: el,
                start: 'top 82%',
                end: 'top 48%',
                scrub: true,
              },
            },
          )
        }
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <main className="page home-immerse">
      <section className="hero spotlight-hero" ref={hero}>
        <div className="spotlight-hole" aria-hidden />
        <div className="hero-copy">
          <p className="kicker">{PLACEHOLDER_KICKER}</p>
          <h1 className="display xl stacked">
            <span>Placeholder</span>
            <span>headline</span>
          </h1>
          <p className="serif hero-lede">Placeholder text</p>
          <div className="hero-meta">
            <button className="btn ghost" type="button" data-sound-toggle onPointerDown={toggle}>
              {on ? 'Mute' : 'Sound on'}
            </button>
            {next && (
              <Link className="btn" to={`/events/${next.id}`}>
                Get tickets
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="statement">
        <div className="marquee-track">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>{PLACEHOLDER_SHORT} — </span>
          ))}
        </div>
      </div>

      <HighlightReel />

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...artists, ...artists].map((a, i) => (
            <span key={a.id + i}>{a.name} — </span>
          ))}
        </div>
      </div>

      <section className="capabilities">
        {CAPABILITIES.map((item) => (
          <Link className="capability" key={item.id} to={item.to}>
            <img src={item.image} alt="" />
            <div>
              <p className="kicker">{item.id}</p>
              <h2 className="display lg">{item.title}</h2>
              <p className="serif">{item.blurb}</p>
              <span className="link-arrow">See what we create →</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="contact-split">
        <div>
          <p className="kicker">{PLACEHOLDER_KICKER}</p>
          <h2 className="display lg">CTA title 01</h2>
          <p className="serif">{PLACEHOLDER_SHORT}</p>
          <Link className="btn" to="/events">
            Primary CTA
          </Link>
        </div>
        <div>
          <p className="kicker">{PLACEHOLDER_KICKER}</p>
          <h2 className="display lg">CTA title 02</h2>
          <p className="serif">{PLACEHOLDER_SHORT}</p>
          <Link className="btn ghost" to="/about">
            Secondary CTA
          </Link>
        </div>
      </section>
    </main>
  )
}
