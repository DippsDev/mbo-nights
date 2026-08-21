import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { artistsFor, getVenue, nights, type Night } from '../data'
import { isNarrow, reducedMotion } from '../lib/motion'
import AtmosphereVideo from './AtmosphereVideo'

export default function HighlightReel() {
  const wrap = useRef<HTMLElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const slides = nights.slice(0, 2)

  useEffect(() => {
    const section = wrap.current
    if (!section || reducedMotion() || isNarrow()) return

    const panels = gsap.utils.toArray<HTMLElement>('.highlight', section)
    const first = panels[0]
    const second = panels[1]
    if (!first || !second) return

    const ctx = gsap.context(() => {
      gsap.set(second, { yPercent: 100 })

      const tl = gsap.timeline({
        defaults: { ease: 'none', force3D: true },
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          end: () => `+=${Math.round(window.innerHeight * 1.45)}`,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
          },
        },
      })

      tl.to(first, { scale: 1.08, opacity: 0.35 }, 0)
      tl.to(first.querySelector('.highlight-copy'), { y: -24, opacity: 0 }, 0)
      tl.to(second, { yPercent: 0 }, 0.08)
      tl.from(second.querySelector('.highlight-copy'), { y: 40, opacity: 0 }, 0.22)
    }, section)

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('orientationchange', refresh)

    return () => {
      window.removeEventListener('orientationchange', refresh)
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
      <AtmosphereVideo poster={night.image} clips={night.clips} alt={night.title} cover />
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
