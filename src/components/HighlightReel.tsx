import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { artistsFor, getVenue, nights, type Night } from '../data'
import { cheapMotion } from '../lib/motion'

export default function HighlightReel() {
  const wrap = useRef<HTMLElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const slides = nights

  useEffect(() => {
    const section = wrap.current
    if (!section || cheapMotion()) return

    const panels = gsap.utils.toArray<HTMLElement>('.highlight', section)
    if (panels.length < 2) return

    const ctx = gsap.context(() => {
      gsap.set(panels.slice(1), { yPercent: 100 })

      const tl = gsap.timeline({
        defaults: { ease: 'none', force3D: true, duration: 1 },
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          end: () => `+=${Math.round(window.innerHeight * 0.9 * (panels.length - 1))}`,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
          },
        },
      })

      panels.forEach((panel, i) => {
        if (i === 0) return
        const prev = panels[i - 1]
        const at = i - 1
        tl.to(prev, { scale: 1.08, opacity: 0.35 }, at)
        tl.to(prev.querySelector('.highlight-copy'), { y: -24, opacity: 0 }, at)
        tl.to(panel, { yPercent: 0 }, at)
        const copy = panel.querySelector('.highlight-copy')
        if (copy) tl.from(copy, { y: 40, opacity: 0, duration: 0.8 }, at + 0.15)
      })
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
