import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { artistsFor, getVenue, nights, type Night } from '../data'
import { reducedMotion } from '../lib/motion'

gsap.registerPlugin(ScrollTrigger)

export default function HighlightReel() {
  const wrap = useRef<HTMLElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const slides = nights.slice(0, 2)

  useEffect(() => {
    const section = wrap.current
    if (!section || reducedMotion()) return

    const panels = gsap.utils.toArray<HTMLElement>('.highlight', section)
    const first = panels[0]
    const second = panels[1]
    if (!first || !second) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 800 ? 1.25 : 1.7))}`,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
          },
        },
      })

      tl.to(
        first,
        {
          scale: 1.18,
          opacity: 0,
          filter: 'blur(10px)',
        },
        0,
      )
      tl.to(first.querySelector('.highlight-copy'), { y: -36, opacity: 0 }, 0)
      tl.fromTo(
        second,
        { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.06 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1 },
        0.12,
      )
      tl.from(
        second.querySelector('.highlight-copy'),
        { y: 72, opacity: 0 },
        0.28,
      )
    }, section)

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('orientationchange', refresh)
    window.visualViewport?.addEventListener('resize', refresh)

    return () => {
      window.removeEventListener('orientationchange', refresh)
      window.visualViewport?.removeEventListener('resize', refresh)
      ctx.revert()
    }
  }, [slides.length])

  return (
    <section className="highlights" ref={wrap}>
      <p className="highlights-label">Highlight projects</p>
      <div className="highlights-stack">
        {slides.map((night) => (
          <HighlightSlide key={night.id} night={night} />
        ))}
      </div>
      <div className="highlights-progress" aria-hidden>
        <span ref={bar} />
      </div>
    </section>
  )
}

function HighlightSlide({ night }: { night: Night }) {
  const venue = getVenue(night.venueId)
  const names = artistsFor(night)
    .map((a) => a.name)
    .join(' · ')

  return (
    <article className="highlight">
      <img src={night.image} alt={night.title} />
      <div className="highlight-copy">
        <p className="kicker">
          {venue?.type} · {venue?.city}
        </p>
        <h2 className="display lg">{night.title}</h2>
        <p className="serif">{night.teaser}</p>
        <p>
          {names} · {night.date}
        </p>
        <Link className="btn" to={`/events/${night.id}`}>
          View project
        </Link>
      </div>
    </article>
  )
}
