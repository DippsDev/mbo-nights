import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BRAND_KICKER,
  BRAND_TAGLINE,
  CAPABILITIES,
  nextOpenNight,
} from '../data'
import HighlightReel from '../components/HighlightReel'
import { cheapMotion, reducedMotion, softScrollReveal } from '../lib/motion'
import { useSound } from '../sound'
import { gsap } from 'gsap'

const HERO_CLIP_DESKTOP = '/video/DippsDevMp4.mp4'
const HERO_CLIP_MOBILE = '/video/DippsDevMobile.mp4'
const HERO_START_DESKTOP = 8
const HERO_START_MOBILE = 0
const HERO_MOBILE_MQ = '(max-width: 799px)'

function heroForViewport() {
  const mobile = typeof window !== 'undefined' && window.matchMedia(HERO_MOBILE_MQ).matches
  return mobile
    ? { src: HERO_CLIP_MOBILE, start: HERO_START_MOBILE }
    : { src: HERO_CLIP_DESKTOP, start: HERO_START_DESKTOP }
}

export default function Home() {
  const next = nextOpenNight()
  const { on, toggle } = useSound()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hero, setHero] = useState(heroForViewport)

  useEffect(() => {
    const mq = window.matchMedia(HERO_MOBILE_MQ)
    const sync = () => setHero(heroForViewport())
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const { start } = hero

    const seekAndPlay = () => {
      try {
        if (start > 0 && video.currentTime < start) video.currentTime = start
      } catch {
        /* ignore seek until ready */
      }
      void video.play().catch(() => undefined)
    }

    const onEnded = () => {
      video.currentTime = start
      void video.play().catch(() => undefined)
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') seekAndPlay()
    }

    // Pause off-screen — decoding a full-bleed loop while scrolling is a common mobile stutter.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting && entry.intersectionRatio > 0.12) seekAndPlay()
        else video.pause()
      },
      { threshold: [0, 0.12, 0.5] },
    )
    io.observe(video)

    if (video.readyState >= 1) seekAndPlay()
    else video.addEventListener('loadedmetadata', seekAndPlay, { once: true })

    video.addEventListener('ended', onEnded)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', seekAndPlay)

    return () => {
      io.disconnect()
      video.removeEventListener('ended', onEnded)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pageshow', seekAndPlay)
    }
  }, [hero])

  useEffect(() => {
    if (reducedMotion()) return

    if (cheapMotion()) {
      return softScrollReveal(
        '.home-immerse .highlight, .home-immerse .capability, .home-immerse .contact-split > div',
        '.home-immerse',
      )
    }

    const ctx = gsap.context(() => {
      // Slight scrub lag feels smoother than 1:1 frame linking on desktop.
      gsap.to('.hero-copy', {
        yPercent: -8,
        opacity: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: '.spotlight-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.55,
        },
      })

      gsap.utils.toArray<HTMLElement>('.capability').forEach((el) => {
        const img = el.querySelector('img')
        const copy = el.querySelector('div')
        if (img) {
          gsap.fromTo(
            img,
            { yPercent: -6, scale: 1.04 },
            {
              yPercent: 0,
              scale: 1,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.55,
              },
            },
          )
        }
        if (copy) {
          gsap.fromTo(
            copy,
            { y: 28, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: el,
                start: 'top 82%',
                end: 'top 48%',
                scrub: 0.45,
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
      <section className="hero spotlight-hero">
        <video
          key={hero.src}
          ref={videoRef}
          className="hero-clip"
          src={hero.src}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        <div className="hero-copy">
          <p className="kicker">{BRAND_KICKER}</p>
          <h1 className="display xl stacked">
            <span>More Bands</span>
            <span>On the way</span>
          </h1>
          <p className="serif hero-lede">{BRAND_TAGLINE}</p>
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

      <HighlightReel />

      <section className="capabilities">
        {CAPABILITIES.map((item) => (
          <Link className="capability" key={item.id} to={item.to}>
            <img src={item.image} alt="" />
            <div>
              <p className="kicker">{item.id}</p>
              <h2 className="display lg">{item.title}</h2>
              <p className="serif">{item.blurb}</p>
              <span className="link-arrow">Explore →</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="contact-split">
        <div>
          <p className="kicker">Next up</p>
          <h2 className="display lg">Next night</h2>
          <p className="serif">Lineup, doors, and tickets for the next show.</p>
          <Link className="btn" to={next ? `/events/${next.id}` : '/artists'}>
            Get tickets
          </Link>
        </div>
      </section>
    </main>
  )
}
